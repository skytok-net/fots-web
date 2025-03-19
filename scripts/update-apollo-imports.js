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
  path.join(appDir, 'lib', 'apollo-client.ts'),
  path.join(appDir, 'lib', 'graphql-tag.ts'),
  path.join(appDir, 'types', 'graphql.ts') // Skip generated GraphQL types file
];

// Directories to skip (generated files)
const skipDirs = [
  path.join(appDir, 'gql') // Skip any generated GraphQL directories
];

// Function to recursively process files in a directory
async function processDirectory(dir) {
  // Skip directories in the skipDirs list
  if (skipDirs.some(skipDir => dir.startsWith(skipDir))) {
    console.log(`Skipping directory ${dir}`);
    return;
  }
  
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
      // Skip files that appear to be generated (containing @generated comment)
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('@generated') || content.includes('* Generated file')) {
        console.log(`Skipping generated file ${fullPath}`);
        continue;
      }
      
      await processFile(fullPath);
    }
  }
}

// Function to process a single file
async function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace direct Apollo imports with centralized imports
    if (content.includes("from '@apollo/client'") || 
        content.includes('from "@apollo/client"')) {
      
      // Extract what's being imported from Apollo
      const importRegex = /import\s+{([^}]+)}\s+from\s+['"]@apollo\/client['"]/g;
      const matches = [...content.matchAll(importRegex)];
      
      if (matches.length > 0) {
        for (const match of matches) {
          const importedItems = match[1].split(',').map(item => item.trim());
          
          // Skip if only importing gql (already handled by previous script)
          if (importedItems.length === 1 && importedItems[0] === 'gql') {
            continue;
          }
          
          // Replace with import from apollo-client
          content = content.replace(
            match[0],
            `import { ${importedItems.join(', ')} } from '~/lib/apollo-client'`
          );
          modified = true;
        }
      }
    }
    
    // Replace default imports from Apollo
    if (content.includes("import pkg from '@apollo/client'") || 
        content.includes('import pkg from "@apollo/client"')) {
      
      // Find any destructured Apollo components
      const destructureRegex = /const\s+{([^}]+)}\s+=\s+pkg/g;
      const destructureMatches = [...content.matchAll(destructureRegex)];
      
      if (destructureMatches.length > 0) {
        for (const match of destructureMatches) {
          const destructuredItems = match[1].split(',').map(item => item.trim());
          
          // Replace with direct import from apollo-client
          content = content.replace(
            /import pkg from ['"]@apollo\/client['"];[\s\n]*const\s+{[^}]+}\s+=\s+pkg/,
            `import { ${destructuredItems.join(', ')} } from '~/lib/apollo-client'`
          );
          modified = true;
        }
      }
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
console.log('Updating Apollo imports throughout the codebase...');
await processDirectory(appDir);
console.log('Import updates complete!');
