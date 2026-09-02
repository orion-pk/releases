import React, { useEffect } from 'react';

// ThemeProvider enforces light theme globally by setting data-theme="light" on the document.
// The full theme-switching infrastructure has been simplified; this is the only active effect.
export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return <>{children}</>;
};
