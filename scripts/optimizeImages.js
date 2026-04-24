const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');

// Configuration
const IMAGES_DIR = path.join(config.rootPath, 'public', 'images', 'products');
const OUTPUT_DIR = path.join(config.rootPath, 'public', 'images', 'optimized');
const SIZES = [
  { width: 300, suffix: 'sm' },
  { width: 600, suffix: 'md' },
  { width: 900, suffix: 'lg' }
];
const FORMATS = ['webp', 'jpeg'];
const QUALITY = 80;

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get all image files
const imageFiles = fs.readdirSync(IMAGES_DIR)
  .filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
  });

console.log(`Found ${imageFiles.length} images to optimize`);

// Process each image
async function processImages() {
  let successCount = 0;
  let errorCount = 0;

  for (const file of imageFiles) {
    const inputPath = path.join(IMAGES_DIR, file);
    const fileName = path.basename(file, path.extname(file));
    
    try {
      // Load image
      const image = sharp(inputPath);
      const metadata = await image.metadata();
      
      // Process for each size and format
      for (const size of SIZES) {
        for (const format of FORMATS) {
          const outputFileName = `${fileName}-${size.suffix}.${format}`;
          const outputPath = path.join(OUTPUT_DIR, outputFileName);
          
          // Skip if file already exists
          if (fs.existsSync(outputPath)) {
            console.log(`Skipping ${outputFileName} (already exists)`);
            continue;
          }
          
          // Resize and convert
          let processedImage = image.clone().resize({
            width: size.width,
            height: Math.round(size.width / (metadata.width / metadata.height)),
            fit: 'inside',
            withoutEnlargement: true
          });
          
          // Set format
          if (format === 'webp') {
            processedImage = processedImage.webp({ quality: QUALITY });
          } else if (format === 'jpeg') {
            processedImage = processedImage.jpeg({ quality: QUALITY });
          }
          
          // Save
          await processedImage.toFile(outputPath);
          console.log(`Optimized: ${outputFileName}`);
          successCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\nOptimization complete!');
  console.log(`Successfully optimized: ${successCount} images`);
  console.log(`Failed: ${errorCount} images`);
}

// Run the optimization
processImages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
