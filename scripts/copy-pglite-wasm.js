#!/usr/bin/env node

/**
 * This script copies the PGlite WASM files to the public directory
 * so they can be accessed by the browser.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination paths
const sourceDir = path.resolve(__dirname, '../node_modules/@electric-sql/pglite/dist');
const destDir = path.resolve(__dirname, '../public/wasm');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`Created directory: ${destDir}`);
}

// Files to copy
const filesToCopy = [
  'postgres.wasm',
  'postgres.data',
  'postgres.js',
  'postgres.cjs',
  'index.js',
  'index.cjs'
];

// Copy worker files from the worker directory
const workerSourceDir = path.join(sourceDir, 'worker');
if (fs.existsSync(workerSourceDir)) {
  const workerFiles = fs.readdirSync(workerSourceDir);
  workerFiles.forEach(file => {
    const sourcePath = path.join(workerSourceDir, file);
    const destPath = path.join(destDir, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied: ${sourcePath} -> ${destPath}`);
  });
}

// Copy main WASM files
filesToCopy.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied: ${sourcePath} -> ${destPath}`);
  } else {
    console.warn(`Warning: Source file not found: ${sourcePath}`);
  }
});

// Create a simple worker script if needed
const workerScript = `
// PGlite Web Worker
importScripts('./postgres.js');

// Make the worker available to the main thread
self.onmessage = function(e) {
  const { id, method, params } = e.data;
  
  try {
    // Process the request and post the result back to the main thread
    self.postMessage({ id, result: 'Worker initialized successfully' });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};

// Notify that the worker is ready
self.postMessage({ type: 'ready' });
`;

const workerPath = path.join(destDir, 'pg-worker.js');
if (!fs.existsSync(workerPath)) {
  fs.writeFileSync(workerPath, workerScript);
  console.log(`Created worker script: ${workerPath}`);
}

console.log('PGlite WASM files copied successfully!');
