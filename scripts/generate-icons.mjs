import sharp from 'sharp';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create public/icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Define the icon sizes to generate
const iconSizes = [
  { size: 16, name: 'favicon-16x16.png', source: 'favicon-base.svg' },
  { size: 32, name: 'favicon-32x32.png', source: 'favicon-base.svg' },
  { size: 72, name: 'icon-72x72.png', source: 'icon-base.svg' },
  { size: 96, name: 'icon-96x96.png', source: 'icon-base.svg' },
  { size: 128, name: 'icon-128x128.png', source: 'icon-base.svg' },
  { size: 144, name: 'icon-144x144.png', source: 'icon-base.svg' },
  { size: 152, name: 'icon-152x152.png', source: 'icon-base.svg' },
  { size: 192, name: 'icon-192x192.png', source: 'icon-base.svg' },
  { size: 384, name: 'icon-384x384.png', source: 'icon-base.svg' },
  { size: 512, name: 'icon-512x512.png', source: 'icon-base.svg' },
  { size: 180, name: 'apple-touch-icon-180x180.png', source: 'apple-touch-icon-base.svg' }
];

// Convert SVGs to PNGs
async function convertIcons() {
  try {
    for (const icon of iconSizes) {
      const sourcePath = path.join(iconsDir, icon.source);
      const outputPath = path.join(iconsDir, icon.name);
      
      console.log(`Converting ${sourcePath} to ${icon.name} (${icon.size}x${icon.size})`);
      
      // Check if source SVG exists
      if (!fs.existsSync(sourcePath)) {
        console.error(`Source file not found: ${sourcePath}`);
        continue;
      }
      
      await sharp(sourcePath)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      
      console.log(`Generated ${icon.name}`);
    }
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

convertIcons(); 