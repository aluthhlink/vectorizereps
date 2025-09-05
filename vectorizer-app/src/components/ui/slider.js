import React from 'react';

const Slider = React.forwardRef(({ className, value, onValueChange, min, max, step, ...props }, ref) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 ${className || ''}`}
      ref={ref}
      {...props}
    />
  );
});

Slider.displayName = "Slider";

export { Slider };