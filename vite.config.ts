import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import fs from 'fs';

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
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
    sourcemap: true,
    target: 'esnext',
    // Ensure proper WASM support
    modulePreload: {
      polyfill: true,
    },
  },
  css: {
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
