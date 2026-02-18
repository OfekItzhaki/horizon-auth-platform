#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const distPath = path.join(rootDir, 'dist');
const nodeModulesTsc = path.join(rootDir, 'node_modules', '.bin', 'tsc');

// Check if dist folder exists and has files
const distExists = fs.existsSync(distPath) && fs.readdirSync(distPath).length > 0;

// Check if TypeScript is available (prefer local node_modules)
let tscCommand = null;
if (fs.existsSync(nodeModulesTsc)) {
  tscCommand = nodeModulesTsc;
} else {
  // Try to install dependencies first
  const nodeModulesPath = path.join(rootDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    try {
      console.log('Installing frontend-services dependencies...');
      execSync('npm install --include=dev', { stdio: 'inherit', cwd: rootDir });
      if (fs.existsSync(nodeModulesTsc)) {
        tscCommand = nodeModulesTsc;
      }
    } catch (e) {
      console.warn('Warning: Could not install dependencies');
    }
  }

  // Try global tsc or npx
  if (!tscCommand) {
    try {
      execSync('tsc --version', { stdio: 'ignore' });
      tscCommand = 'tsc';
    } catch (e) {
      try {
        execSync('npx tsc --version', { stdio: 'ignore' });
        tscCommand = 'npx tsc';
      } catch (e2) {
        // TypeScript not available
      }
    }
  }
}

// Build if TypeScript is available and dist doesn't exist or is empty
if (tscCommand && !distExists) {
  try {
    console.log('Building frontend-services...');
    execSync(`"${tscCommand}"`, { stdio: 'inherit', cwd: rootDir });
  } catch (e) {
    console.warn('Warning: Could not build frontend-services. Make sure TypeScript is installed.');
    if (!distExists) {
      console.error('Error: dist folder does not exist and build failed.');
      process.exit(1);
    }
  }
} else if (!tscCommand && !distExists) {
  console.error('Error: TypeScript not available and dist folder does not exist.');
  console.error('Please run "npm install" and "npm run build" in frontend-services first.');
  process.exit(1);
} else if (distExists) {
  console.log('frontend-services dist folder exists, skipping build.');
}
