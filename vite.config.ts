import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import fs from 'fs';

// Custom plugin to ignore sourcemap warnings in both development and build
function ignoreSourcemapWarnings(): Plugin {
  return {
    name: 'ignore-sourcemap-warnings',
    // Apply in both serve and build modes
    configureServer(server) {
      // Store original logger methods
      const originalWarn = server.config.logger.warn;
      
      // Override warn method to filter out sourcemap warnings
      server.config.logger.warn = function(msg: any, options?: any) {
        if (typeof msg === 'string' && msg.includes('Error when using sourcemap')) {
          // Silently ignore sourcemap warnings
          return;
        }
        return originalWarn.call(server.config.logger, msg, options);
      };
    },
    // For build process
    buildStart() {
      // Patch console.warn to filter out sourcemap errors during build
      const originalConsoleWarn = console.warn;
      console.warn = function(...args: any[]) {
        const msg = args[0];
        if (typeof msg === 'string' && msg.includes('Error when using sourcemap')) {
          return; // Skip this warning
        }
        return originalConsoleWarn.apply(console, args);
      };
      
      // Patch console.error to filter out sourcemap errors during build
      const originalConsoleError = console.error;
      console.error = function(...args: any[]) {
        const msg = args[0];
        if (typeof msg === 'string' && msg.includes('Error when using sourcemap')) {
          return; // Skip this error
        }
        return originalConsoleError.apply(console, args);
      };
    }
  };
}

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}



export default defineConfig({
  plugins: [
    // Add our custom plugin to ignore sourcemap warnings during development
    ignoreSourcemapWarnings(),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
      '~/components': resolve(__dirname, './app/components'),
      '~/lib': resolve(__dirname, './app/lib'),
      '~/styles': resolve(__dirname, './app/styles'),
      '~/stores': resolve(__dirname, './app/stores'),
      '~/types': resolve(__dirname, './app/types')
    }
  },
  build: {
    // Enable sourcemaps in production for debugging
    sourcemap: true,
    target: 'esnext',
    // Ensure proper WASM support
    modulePreload: {
      polyfill: true,
    },
    // Add rollup options to improve sourcemap handling
    rollupOptions: {
      output: {
        // This helps with sourcemap generation without excluding source content
        sourcemapPathTransform: (relativeSourcePath) => {
          // Normalize paths for better compatibility
          return relativeSourcePath.replace(/\\/g, '/');
        },
      },
    },
  },
  css: {
    // Enable CSS sourcemaps in all environments
    devSourcemap: true
  },
  optimizeDeps: {
    // Exclude PGlite from optimization to prevent issues with WASM loading
    exclude: ['@electric-sql/pglite'],
  },
  server: {
    headers: {
      // Allow loading WASM modules
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      // Allow serving files from app, public, and node_modules directories
      allow: ['app', 'public', 'node_modules'],
    },
  }
});
