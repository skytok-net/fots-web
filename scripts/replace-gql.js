#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'app');

// Files to skip
const skipFiles = [
  path.join(appDir, 'lib', 'graphql-tag.ts')
];

// Function to recursively process files in a directory
async function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip files in the skipFiles list
    if (skipFiles.includes(fullPath)) {
      console.log(`Skipping ${fullPath}`);
      continue;
    }
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      await processFile(fullPath);
    }
  }
}

// Function to process a single file
async function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace import statements
    if (content.includes("import { gql } from '@apollo/client'") || 
        content.includes('import { gql } from "@apollo/client"')) {
      content = content.replace(
        /import\s*{\s*gql\s*}\s*from\s*['"]@apollo\/client['"]/g, 
        "import { graphql } from '~/lib/graphql-tag'"
      );
      modified = true;
    }
    
    // Replace destructured gql from a package
    if (content.includes("const { gql } = pkg")) {
      content = content.replace(
        /const\s*{\s*gql\s*}\s*=\s*pkg/g,
        "import { graphql } from '~/lib/graphql-tag'; // Replaced destructured gql"
      );
      modified = true;
    }
    
    // Replace gql function calls
    if (content.includes("gql`")) {
      content = content.replace(/gql`/g, "graphql`");
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Start processing from the app directory
console.log('Replacing gql with graphql throughout the codebase...');
await processDirectory(appDir);
console.log('Replacement complete!');
