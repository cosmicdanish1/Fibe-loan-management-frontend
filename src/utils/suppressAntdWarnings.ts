// Suppress Ant Design React 19 compatibility warnings
// This is a temporary solution until Ant Design releases full React 19 support

const originalConsoleWarn = console.warn;

console.warn = (...args: any[]) => {
  // Suppress specific Ant Design React 19 compatibility warnings
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('antd v5 support React is 16 ~ 18') ||
     message.includes('compatible') ||
     message.includes('u.ant.design/v5-for-19'))
  ) {
    return; // Suppress this warning
  }
  
  // Allow all other warnings to pass through
  originalConsoleWarn.apply(console, args);
};

export {};
