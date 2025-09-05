import React from 'react';

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  
  const variantClasses = variant === 'outline' 
    ? "border border-input hover:bg-accent hover:text-accent-foreground" 
    : "bg-primary text-primary-foreground hover:bg-primary/90";
    
  const sizeClasses = size === 'sm' 
    ? "h-9 rounded-md px-3" 
    : "h-10 py-2 px-4";
    
  const classes = `${baseClasses} ${variantClasses} ${sizeClasses} ${className || ''}`;
  
  return (
    <button
      className={classes}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button };