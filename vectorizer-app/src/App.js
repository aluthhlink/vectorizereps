import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ImageTracer from "imagetracerjs";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Slider } from "./components/ui/slider";
import { Input } from "./components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { UploadCloud, Image as ImageIcon, Download, Wand2, Settings2, FileType } from "lucide-react";

// --- Utility: read file to data URL
const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// --- SVG <-> EPS (very lightweight, path-only) ---
// Parses an SVG path string into PostScript operators (M,L,H,V,C,Q,Z).
// NOTE: This is a pragmatic converter to support ImageTracer output (L/C/Z mostly).
function svgPathToPostScript(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  let i = 0;
  let cmd = "";
  let x = 0, y = 0; // current
  let subx = 0, suby = 0; // subpath start
  let ps = [];
  const nextNum = () => parseFloat(tokens[i++]);

  const cubic = (x1,y1,x2,y2,x3,y3) => {
    ps.push(`${x1} ${y1} ${x2} ${y2} ${x3} ${y3} curveto`);
    x = x3; y = y3;
  };

  const lineTo = (nx, ny) => {
    ps.push(`${nx} ${ny} lineto`);
    x = nx; y = ny;
  };

  while (i < tokens.length) {
    const t = tokens[i++];
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
    } else {
      // If command omitted, repeat last cmd
      i--; // step back one token to reprocess number with current cmd
    }

    switch (cmd) {
      case 'M': {
        const nx = nextNum();
        const ny = nextNum();
        ps.push(`${nx} ${ny} moveto`);
        x = nx; y = ny; subx = nx; suby = ny;
        // Implicit LineTos for extra pairs
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const lx = nextNum();
          const ly = nextNum();
          lineTo(lx, ly);
        }
        break;
      }
      case 'm': {
        const nx = x + nextNum();
        const ny = y + nextNum();
        ps.push(`${nx} ${ny} moveto`);
        x = nx; y = ny; subx = nx; suby = ny;
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const lx = x + nextNum();
          const ly = y + nextNum();
          lineTo(lx, ly);
        }
        break;
      }
      case 'L': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const nx = nextNum();
          const ny = nextNum();
          lineTo(nx, ny);
        }
        break;
      }
      case 'l': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const nx = x + nextNum();
          const ny = y + nextNum();
          lineTo(nx, ny);
        }
        break;
      }
      case 'H': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const nx = nextNum();
          lineTo(nx, y);
        }
        break;
      }
      case 'h': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const nx = x + nextNum();
          lineTo(nx, y);
        }
        break;
      }
      case 'V': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const ny = nextNum();
          lineTo(x, ny);
        }
        break;
      }
      case 'v': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const ny = y + nextNum();
          lineTo(x, ny);
        }
        break;
      }
      case 'C': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const x1 = nextNum();
          const y1 = nextNum();
          const x2 = nextNum();
          const y2 = nextNum();
          const x3 = nextNum();
          const y3 = nextNum();
          cubic(x1,y1,x2,y2,x3,y3);
        }
        break;
      }
      case 'c': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const x1 = x + nextNum();
          const y1 = y + nextNum();
          const x2 = x + nextNum();
          const y2 = y + nextNum();
          const x3 = x + nextNum();
          const y3 = y + nextNum();
          cubic(x1,y1,x2,y2,x3,y3);
        }
        break;
      }
      case 'Q': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          // Convert quadratic to cubic
          const x1 = nextNum();
          const y1 = nextNum();
          const x2 = nextNum();
          const y2 = nextNum();
          const cx1 = x + 2/3*(x1 - x);
          const cy1 = y + 2/3*(y1 - y);
          const cx2 = x2 + 2/3*(x1 - x2);
          const cy2 = y2 + 2/3*(y1 - y2);
          cubic(cx1,cy1,cx2,cy2,x2,y2);
        }
        break;
      }
      case 'q': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const x1 = x + nextNum();
          const y1 = y + nextNum();
          const x2 = x + nextNum();
          const y2 = y + nextNum();
          const cx1 = x + 2/3*(x1 - x);
          const cy1 = y + 2/3*(y1 - y);
          const cx2 = x2 + 2/3*(x1 - x2);
          const cy2 = y2 + 2/3*(y1 - y2);
          cubic(cx1,cy1,cx2,cy2,x2,y2);
        }
        break;
      }
      case 'Z':
      case 'z': {
        ps.push('closepath');
        x = subx; y = suby;
        break;
      }
      default: {
        // Unsupported commands (A, S, T) are ignored for simplicity
        // This is usually fine for ImageTracer output
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) i++;
      }
    }
  }
  return ps.join("\n");
}

function svgToEPS(svgString, width, height) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  // Flip Y-axis: PostScript origin is bottom-left; SVG is top-left.
  // We'll scale Y by -1 and translate to height.
  let eps = [];
  eps.push("%!PS-Adobe-3.0 EPSF-3.0");
  eps.push(`%%BoundingBox: 0 0 ${Math.ceil(width)} ${Math.ceil(height)}`);
  eps.push("%%Creator: Vectorize & Export (SVG/EPS) App");
  eps.push("%%LanguageLevel: 2");
  eps.push("%%Pages: 1");
  eps.push("%%EndComments\n");
  eps.push("gsave");
  eps.push(`1 -1 scale 0 ${-height} translate`);

  const paths = Array.from(doc.querySelectorAll('path'));
  paths.forEach((p) => {
    const fill = p.getAttribute('fill');
    const stroke = p.getAttribute('stroke');
    const strokeWidth = parseFloat(p.getAttribute('stroke-width') || '0');
    const d = p.getAttribute('d') || '';

    if (!d.trim()) return;

    eps.push("newpath");
    eps.push(svgPathToPostScript(d));

    if (fill && fill !== 'none') {
      const { r, g, b } = cssColorToRGB(fill);
      eps.push(`${r} ${g} ${b} setrgbcolor`);
      eps.push("fill");
    }
    if (stroke && stroke !== 'none' && strokeWidth > 0) {
      const { r, g, b } = cssColorToRGB(stroke);
      eps.push("newpath");
      eps.push(svgPathToPostScript(d));
      eps.push(`${strokeWidth} setlinewidth`);
      eps.push(`${r} ${g} ${b} setrgbcolor`);
      eps.push("stroke");
    }
  });
  eps.push("grestore");
  eps.push("showpage");
  eps.push("%%EOF");
  return eps.join("\n");
}

function cssColorToRGB(color) {
  // Accepts formats like rgb(), #hex, or named colors (basic)
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = color;
  const computed = ctx.fillStyle; // normalized to rgb(a)
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(computed);
  if (m) {
    return { r: (+m[1])/255, g: (+m[2])/255, b: (+m[3])/255 };
  }
  // Hex fallback
  if (computed.startsWith('#')) {
    const hex = computed.slice(1);
    const n = parseInt(hex.length === 3 ? hex.split('').map(h=>h+h).join('') : hex, 16);
    return { r: ((n>>16)&255)/255, g: ((n>>8)&255)/255, b: (n&255)/255 };
  }
  return { r: 0, g: 0, b: 0 };
}

export default function App() {
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [originalSize, setOriginalSize] = useState({ w: 0, h: 0 });
  const [svgString, setSvgString] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Vectorization params
  const [ltres, setLtres] = useState(1); // line threshold
  const [qtres, setQtres] = useState(1); // curve threshold
  const [pathomit, setPathomit] = useState(8); // ignore small paths
  const [numberofcolors, setNumberofcolors] = useState(16);
  const [blurradius, setBlurradius] = useState(0);

  const imgRef = useRef(null);

  const handleFiles = async (files) => {
    setError("");
    const file = files?.[0];
    if (!file) return;
    const ok = /image\/(png|jpeg|jpg)/i.test(file.type);
    if (!ok) {
      setError("Please upload a PNG or JPEG file.");
      return;
    }
    const url = await readAsDataURL(file);
    setImageDataUrl(url);
  };

  useEffect(() => {
    if (!imageDataUrl) return;
    // load to get dimensions
    const img = new Image();
    img.onload = () => setOriginalSize({ w: img.width, h: img.height });
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  const runVectorize = async () => {
    if (!imageDataUrl) return;
    setBusy(true);
    setError("");
    try {
      const opts = {
        ltres, qtres, pathomit,
        rightangleenhance: true,
        blurradius,
        numberofcolors,
        // palette: undefined // auto
      };
      // ImageTracer can take a "url" (data URL works) and call back with an SVG string
      ImageTracer.imageToSVG(imageDataUrl, (svgstr) => {
        setSvgString(svgstr);
        setBusy(false);
      }, opts);
    } catch (e) {
      setBusy(false);
      setError(String(e));
    }
  };

  const download = (content, name, type) => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  };

  const handleDownloadSVG = () => {
    if (!svgString) return;
    download(svgString, 'vectorized.svg', 'image/svg+xml');
  };

  const handleDownloadEPS = () => {
    if (!svgString) return;
    const eps = svgToEPS(svgString, originalSize.w || 1000, originalSize.h || 1000);
    download(eps, 'vectorized.eps', 'application/postscript');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vectorizer</h1>
            <p className="text-slate-600">Upload PNG/JPEG → Vectorize → Export SVG or EPS</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleDownloadSVG} disabled={!svgString} className="rounded-2xl shadow">
              <Download className="mr-2 h-4 w-4" /> SVG
            </Button>
            <Button onClick={handleDownloadEPS} disabled={!svgString} className="rounded-2xl shadow">
              <FileType className="mr-2 h-4 w-4" /> EPS
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Controls */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Settings2 className="h-5 w-5"/> Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Upload image (PNG/JPEG)</label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/png,image/jpeg" onChange={(e)=>handleFiles(e.target.files)} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Tip: high-contrast art works best.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Line threshold (ltres): {ltres}</label>
                <Slider min={0.5} max={10} step={0.5} value={[ltres]} onValueChange={([v])=>setLtres(v)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Curve threshold (qtres): {qtres}</label>
                <Slider min={0.5} max={10} step={0.5} value={[qtres]} onValueChange={([v])=>setQtres(v)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Ignore small paths (pathomit): {pathomit}</label>
                <Slider min={0} max={50} step={1} value={[pathomit]} onValueChange={([v])=>setPathomit(v)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Colors: {numberofcolors}</label>
                <Slider min={2} max={64} step={1} value={[numberofcolors]} onValueChange={([v])=>setNumberofcolors(v)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Blur radius: {blurradius}</label>
                <Slider min={0} max={10} step={1} value={[blurradius]} onValueChange={([v])=>setBlurradius(v)} />
              </div>

              <Button onClick={runVectorize} disabled={!imageDataUrl || busy} className="w-full rounded-2xl">
                <Wand2 className="mr-2 h-4 w-4" /> {busy ? 'Vectorizing…' : 'Vectorize'}
              </Button>

              {error && <p className="text-sm text-red-600">{error}</p>}

              {originalSize.w>0 && (
                <p className="text-xs text-slate-500">Original size: {originalSize.w} × {originalSize.h}px</p>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><ImageIcon className="h-5 w-5"/> Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="source">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="source">Source</TabsTrigger>
                    <TabsTrigger value="vector">Vector (SVG)</TabsTrigger>
                    <TabsTrigger value="code">SVG Code</TabsTrigger>
                  </TabsList>
                  <TabsContent value="source" className="mt-4">
                    {imageDataUrl ? (
                      <div className="flex items-center justify-center">
                        <img ref={imgRef} src={imageDataUrl} alt="Uploaded" className="max-h-[480px] max-w-full rounded-2xl shadow"/>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-slate-500">
                        <UploadCloud className="mb-2 h-8 w-8"/>
                        <p>Drop a PNG/JPEG to begin</p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="vector" className="mt-4">
                    {svgString ? (
                      <div className="overflow-auto rounded-2xl border bg-white p-4 shadow">
                        <div
                          className="w-full"
                          dangerouslySetInnerHTML={{ __html: svgString }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Run vectorization to see the SVG preview.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="code" className="mt-4">
                    {svgString ? (
                      <pre className="max-h-[480px] overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">{svgString}</pre>
                    ) : (
                      <p className="text-sm text-slate-500">No SVG yet.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to get clean results</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-6 text-sm text-slate-700">
                  <li>Start with high-contrast images (logos, icons, line art).</li>
                  <li>Increase <strong>Colors</strong> for photos; decrease for logos.</li>
                  <li>Use small <strong>Blur</strong> to reduce noise before tracing.</li>
                  <li>Raise <strong>pathomit</strong> to drop tiny specks/shapes.</li>
                  <li>Tweak <strong>ltres/qtres</strong> for smoother curves vs. detail.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Built with ImageTracer.js. EPS export is path-based and may not support exotic SVG commands (A/S/T).
        </footer>
      </div>
    </div>
  );
}