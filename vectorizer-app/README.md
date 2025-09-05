# Vectorizer App

A React application that converts raster images (PNG/JPEG) to vector formats (SVG/EPS) using ImageTracer.js.

## Features

- Upload PNG/JPEG images
- Vectorize images with adjustable parameters
- Preview vectorized images
- Export as SVG or EPS formats
- Responsive design with Tailwind CSS

## Deployment to GitHub Pages

1. Replace `your-username` in the `homepage` field of `package.json` with your actual GitHub username:
   ```json
   "homepage": "https://your-username.github.io/vectorizer-app"
   ```

2. Create a new GitHub repository named `vectorizer-app` (must match the name in the homepage URL).

3. Push your code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/vectorizer-app.git
   git push -u origin main
   ```

4. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

## Development

To run the app locally:
```bash
npm start
```

To build the app for production:
```bash
npm run build
```

## Dependencies

- React
- ImageTracer.js
- Framer Motion
- Lucide React
- Tailwind CSS