// app/components/PGliteLoader.tsx
import React, { useEffect, useState } from 'react';
import { usePGlite } from '~/stores/pglite-store';

interface PGliteLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PGliteLoader({ children, fallback = <div>Loading data...</div> }: PGliteLoaderProps) {
  const { isInitialized, isInitializing, error } = usePGlite();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Allow the UI to render at least once before showing the content
    // This helps prevent hydration issues
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isReady) {
    return null;
  }
  
  if (error) {
    return (
      <div className="error-container">
        <p>Failed to initialize local database. Using server data instead.</p>
        {children}
      </div>
    );
  }
  
  if (!isInitialized && isInitializing) {
    return fallback;
  }
  
  return <>{children}</>;
}