import React, { useState, useEffect } from 'react';
import { usePGliteStore, getPGlitePerformanceMetrics } from '~/stores/pglite-store';
import { getPGliteMetrics } from '~/lib/pglite-init';
import '~/styles/pglite-monitor.css';

/**
 * A development component to monitor PGlite performance and status
 * Only renders in development mode
 */
export function PGliteMonitor() {
  const { isInitialized, error, schemaVersion } = usePGliteStore();
  const [metrics, setMetrics] = useState(getPGliteMetrics());
  const [expanded, setExpanded] = useState(false);
  
  // Update metrics every second
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    
    const interval = setInterval(() => {
      setMetrics(getPGliteMetrics());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  // Format time in ms
  const formatTime = (ms: number) => `${ms.toFixed(2)}ms`;
  
  return (
    <div 
      className={`pglite-monitor ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="pglite-monitor-header">
        <strong>PGlite Monitor</strong>
        <span>{expanded ? '▼' : '▲'}</span>
      </div>
      
      {expanded && (
        <div>
          <div className="pglite-monitor-section">
            <div>Status: <span className={isInitialized ? 'status-initialized' : 'status-not-initialized'}>
              {isInitialized ? 'Initialized' : 'Not Initialized'}
            </span></div>
            <div>Schema: <span>{schemaVersion || 'Unknown'}</span></div>
            {error && (
              <div className="error-message">
                Error: {error.message}
              </div>
            )}
          </div>
          
          <div className="pglite-monitor-section">
            <strong>Query Stats:</strong>
            <div>Count: {metrics.queryStats.count}</div>
            <div>Avg Time: {formatTime(metrics.queryStats.avgTime || 0)}</div>
            <div>Max Time: {formatTime(metrics.queryStats.maxTime)}</div>
            <div>Slow Queries: {metrics.queryStats.slowQueries}</div>
          </div>
          
          <div className="pglite-monitor-section">
            <strong>Migration Stats:</strong>
            <div>Total: {metrics.migrationStats.totalMigrations}</div>
            {metrics.migrationStats.lastMigrationTime && (
              <div>Last: {new Date(metrics.migrationStats.lastMigrationTime).toLocaleTimeString()}</div>
            )}
          </div>
          
          <div className="pglite-monitor-section">
            <strong>Sync Stats:</strong>
            <div>Total: {metrics.syncStats.totalSyncs}</div>
            {metrics.syncStats.lastSyncTime && (
              <div>Last: {new Date(metrics.syncStats.lastSyncTime).toLocaleTimeString()}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
