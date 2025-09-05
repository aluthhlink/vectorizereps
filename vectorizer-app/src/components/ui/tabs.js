import React from 'react';

const Tabs = ({ defaultValue, children, className, ...props }) => {
  const [value, setValue] = React.useState(defaultValue);
  
  return (
    <div className={className} {...props}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { 
          value: value, 
          onValueChange: setValue 
        })
      )}
    </div>
  );
};

const TabsList = ({ className, ...props }) => (
  <div 
    className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className || ''}`} 
    {...props} 
  />
);

const TabsTrigger = ({ value, onValueChange, className, children, ...props }) => {
  const context = React.useContext(TabsContext);
  
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${className || ''}`}
      onClick={() => onValueChange && onValueChange(value)}
      data-state={context?.value === value ? 'active' : 'inactive'}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, className, children, ...props }) => {
  const context = React.useContext(TabsContext);
  
  if (context?.value !== value) return null;
  
  return (
    <div 
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ''}`} 
      {...props}
    >
      {children}
    </div>
  );
};

const TabsContext = React.createContext();

Tabs.Trigger = TabsTrigger;
Tabs.List = TabsList;
Tabs.Content = TabsContent;

export { Tabs, TabsList, TabsTrigger, TabsContent };