const path = require('path');
const fs = require('fs');
const os = require('os');
const sharp = require('sharp');
const config = require('../config');

/**
 * Middleware for optimizing images on-the-fly
 * Supports:
 * - Resizing (width, height)
 * - Format conversion (webp, jpeg, png)
 * - Quality adjustment
 * - Caching optimized images
 */
const imageOptimizer = async (req, res, next) => {
  // Check if the request is for an image in the products directory
  if (!req.path.startsWith('/images/products/')) {
    return next();
  }

  try {
    // Get image path
    const imagePath = path.join(config.rootPath, 'public', req.path);
    
    // Check if original image exists
    if (!fs.existsSync(imagePath)) {
      return next();
    }

    // Get query parameters
    const width = parseInt(req.query.width) || null;
    const height = parseInt(req.query.height) || null;
    const format = req.query.format || 'jpeg';
    const quality = parseInt(req.query.quality) || 80;
    
    // Only process if we have optimization parameters
    if (!width && !height && !req.query.format && !req.query.quality) {
      return next();
    }

    // Create cache directory if it doesn't exist
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const cacheDir = isServerless
      ? path.join(os.tmpdir(), 'cache', 'images')
      : path.join(config.rootPath, 'public', 'cache', 'images');
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
    } catch (mkdirErr) {
      // Ignore directory creation error in restricted filesystems
    }

    // Generate cache key and path
    const fileExt = format.toLowerCase();
    const fileName = path.basename(imagePath, path.extname(imagePath));
    const cacheKey = `${fileName}-w${width || 'auto'}-h${height || 'auto'}-q${quality}.${fileExt}`;
    const cachePath = path.join(cacheDir, cacheKey);

    // Check if cached version exists
    if (fs.existsSync(cachePath)) {
      const cachedImage = fs.readFileSync(cachePath);
      res.type(`image/${fileExt}`);
      return res.send(cachedImage);
    }

    // Process image with sharp
    let imageProcessor = sharp(imagePath);
    
    // Resize if needed
    if (width || height) {
      imageProcessor = imageProcessor.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Convert format
    switch (format.toLowerCase()) {
      case 'webp':
        imageProcessor = imageProcessor.webp({ quality });
        break;
      case 'png':
        imageProcessor = imageProcessor.png({ quality });
        break;
      case 'jpeg':
      case 'jpg':
      default:
        imageProcessor = imageProcessor.jpeg({ quality });
        break;
    }
    
    // Process and save to cache
    const optimizedImage = await imageProcessor.toBuffer();
    try {
      fs.writeFileSync(cachePath, optimizedImage);
    } catch (writeErr) {
      // Ignore cache write error if filesystem is restricted
    }
    
    // Send optimized image
    res.type(`image/${fileExt}`);
    res.send(optimizedImage);
  } catch (error) {
    console.error('Image optimization error:', error);
    next(); // Continue to serve original image
  }
};

module.exports = imageOptimizer;
