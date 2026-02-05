#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '../public/images');
const BACKUP_DIR = path.join(__dirname, '../public/images-backup');
const WEBP_QUALITY = 70;

const IMAGE_CONFIGS = {
  // Gallery images (About page - *asso.* files)
  // Displayed in 3-col grid at ~440px, need 880px for 2x retina
  gallery_asso: {
    pattern: /^\d+asso\.(jpg|jpeg|png)$/i,
    maxWidth: 880,
    maxHeight: 587, // 3:2 aspect ratio
  },
  
  // Gallery images (Harmonie page - harmonie*.* files, except harmonie25.png hero)
  // Displayed in 3-col grid at ~440px, need 880px for 2x retina
  gallery_harmonie: {
    pattern: /^harmonie(?!25\.png)\d*\.(jpg|jpeg|png)$/i,
    maxWidth: 880,
    maxHeight: 587, // 3:2 aspect ratio
  },
  
  // Hero image (Harmonie page - harmonie25.png)
  // Displayed full width at max 1320px
  hero: {
    pattern: /^harmonie25\.png$/i,
    maxWidth: 1320,
    maxHeight: 580, // Maintains approximate aspect ratio
  },
  
  // TheDansant flyers
  // Displayed in 2-col grid at ~448px, need 896px for 2x retina
  thedansant_flyers: {
    pattern: /^thedansant\/thedansant2026\d\.png$/i,
    maxWidth: 896,
    maxHeight: null, // Keep aspect ratio
  },
  
  // TheDansant gallery
  // Displayed in 2-col grid at ~448px, need 896px for 2x retina
  thedansant_gallery: {
    pattern: /^thedansant\/thedansant\d+\.jpg$/i,
    maxWidth: 896,
    maxHeight: 597, // 3:2 aspect ratio
  },
  
  // Home slideshow
  // Displayed at 360px mobile, ~660px desktop, need 1320px for 2x retina
  home: {
    pattern: /^home\d\.jpg$/i,
    maxWidth: 1320,
    maxHeight: null, // Keep aspect ratio
  },
  
  // Team photos
  // Displayed at max 275px, need 550px for 2x retina
  team: {
    pattern: /^team\/.*\.png$/i,
    maxWidth: 550,
    maxHeight: null, // Keep aspect ratio
  },
  
  // Logo images (header/footer)
  // Displayed at h-16 (64px) to h-20 (80px), need 160px for 2x retina
  logos: {
    pattern: /^logo(-dark)?\.png$/i,
    maxWidth: null,
    maxHeight: 160,
  },
  
  // Partner/sponsor logos
  // Displayed at max-h-24 (96px), need 192px for 2x retina
  partner_logos: {
    pattern: /^(logo-|graindevent|arbre|oiseau|beperfect|logoisabelle).*\.(png|jpg|jpeg)$/i,
    maxWidth: null,
    maxHeight: 192,
  },
  
  // TheDansant sponsor logos
  thedansant_logos: {
    pattern: /^thedansant\/(boulangerie|llogorc|madeinsens|minedor)\.(jpg|png)$/i,
    maxWidth: null,
    maxHeight: 128,
  },
  
  // Info icon
  info_icon: {
    pattern: /^i\.png$/i,
    maxWidth: 660,
    maxHeight: null,
  },
};

function getConfigForFile(relativePath) {
  for (const [name, config] of Object.entries(IMAGE_CONFIGS)) {
    if (config.pattern.test(relativePath)) {
      return { name, ...config };
    }
  }
  return null;
}

async function getImageInfo(filePath) {
  const sharp = (await import('sharp')).default;
  const metadata = await sharp(filePath).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: fs.statSync(filePath).size,
  };
}

async function optimizeImage(inputPath, outputPath, config) {
  const sharp = (await import('sharp')).default;
  
  let pipeline = sharp(inputPath);
  
  // Resize if needed
  if (config.maxWidth || config.maxHeight) {
    pipeline = pipeline.resize({
      width: config.maxWidth || undefined,
      height: config.maxHeight || undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  
  // Convert to WebP
  pipeline = pipeline.webp({ quality: WEBP_QUALITY });
  
  await pipeline.toFile(outputPath);
  
  return fs.statSync(outputPath).size;
}

async function processImages(dryRun = true) {
  const sharp = (await import('sharp')).default;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(dryRun ? '  DRY RUN - No changes will be made' : '  OPTIMIZING IMAGES');
  console.log(`${'='.repeat(60)}\n`);
  
  const results = {
    processed: [],
    skipped: [],
    errors: [],
    totalOriginalSize: 0,
    totalNewSize: 0,
  };
  
  function walkDir(dir, baseDir = dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkDir(fullPath, baseDir));
      } else if (/\.(jpg|jpeg|png)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }
  
  const imageFiles = walkDir(IMAGES_DIR);
  
  for (const filePath of imageFiles) {
    const relativePath = path.relative(IMAGES_DIR, filePath);
    const config = getConfigForFile(relativePath);
    
    if (!config) {
      results.skipped.push({ path: relativePath, reason: 'No matching config' });
      continue;
    }
    
    try {
      const info = await getImageInfo(filePath);
      results.totalOriginalSize += info.size;
      
      // Check if resize is needed
      const needsResize = 
        (config.maxWidth && info.width > config.maxWidth) ||
        (config.maxHeight && info.height > config.maxHeight);
      
      const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const relativeWebpPath = path.relative(IMAGES_DIR, webpPath);
      
      if (dryRun) {
        // Estimate new size (rough estimate: 70% quality WebP is ~30-50% of JPEG, ~10-20% of PNG)
        const isPng = /\.png$/i.test(filePath);
        const compressionRatio = isPng ? 0.15 : 0.4;
        const resizeRatio = needsResize ? 
          Math.min(
            config.maxWidth ? config.maxWidth / info.width : 1,
            config.maxHeight ? config.maxHeight / info.height : 1
          ) ** 2 : 1;
        const estimatedSize = Math.round(info.size * compressionRatio * resizeRatio);
        
        results.processed.push({
          path: relativePath,
          config: config.name,
          originalSize: info.size,
          newSize: estimatedSize,
          dimensions: `${info.width}x${info.height}`,
          targetDimensions: `${config.maxWidth || 'auto'}x${config.maxHeight || 'auto'}`,
          needsResize,
          webpPath: relativeWebpPath,
        });
        results.totalNewSize += estimatedSize;
      } else {
        // Create backup
        if (!fs.existsSync(BACKUP_DIR)) {
          fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        const backupPath = path.join(BACKUP_DIR, relativePath);
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        fs.copyFileSync(filePath, backupPath);
        
        // Optimize
        const newSize = await optimizeImage(filePath, webpPath, config);
        
        // Remove original if different extension
        if (webpPath !== filePath) {
          fs.unlinkSync(filePath);
        }
        
        results.processed.push({
          path: relativePath,
          config: config.name,
          originalSize: info.size,
          newSize,
          dimensions: `${info.width}x${info.height}`,
          webpPath: relativeWebpPath,
        });
        results.totalNewSize += newSize;
      }
    } catch (error) {
      results.errors.push({ path: relativePath, error: error.message });
    }
  }
  
  // Print results
  console.log('PROCESSED FILES:');
  console.log('-'.repeat(100));
  console.log(
    'File'.padEnd(45) +
    'Config'.padEnd(20) +
    'Original'.padEnd(12) +
    'New'.padEnd(12) +
    'Savings'
  );
  console.log('-'.repeat(100));
  
  for (const item of results.processed) {
    const savings = ((1 - item.newSize / item.originalSize) * 100).toFixed(0);
    console.log(
      item.path.padEnd(45) +
      item.config.padEnd(20) +
      formatBytes(item.originalSize).padEnd(12) +
      formatBytes(item.newSize).padEnd(12) +
      `${savings}%`
    );
  }
  
  if (results.skipped.length > 0) {
    console.log('\nSKIPPED FILES:');
    for (const item of results.skipped) {
      console.log(`  ${item.path}: ${item.reason}`);
    }
  }
  
  if (results.errors.length > 0) {
    console.log('\nERRORS:');
    for (const item of results.errors) {
      console.log(`  ${item.path}: ${item.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log(`  Files processed: ${results.processed.length}`);
  console.log(`  Files skipped: ${results.skipped.length}`);
  console.log(`  Errors: ${results.errors.length}`);
  console.log(`  Original total: ${formatBytes(results.totalOriginalSize)}`);
  console.log(`  New total: ${formatBytes(results.totalNewSize)} (estimated)`);
  console.log(`  Savings: ${formatBytes(results.totalOriginalSize - results.totalNewSize)} (${((1 - results.totalNewSize / results.totalOriginalSize) * 100).toFixed(1)}%)`);
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\nTo apply changes, run: node scripts/optimize-images.mjs --apply');
  }
  
  return results;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

processImages(dryRun).catch(console.error);
