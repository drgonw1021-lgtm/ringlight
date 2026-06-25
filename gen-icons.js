// Generate PNG icons using pure Node.js (no external deps)
const zlib = require('zlib');
const fs = require('fs');

function createPNG(width, height, drawFn) {
  // RGBA pixel buffer
  const pixels = Buffer.alloc(width * height * 4);
  
  // Fill pixels using drawFn(x, y) => [r, g, b, a]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y);
      const idx = (y * width + x) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }
  
  // Build PNG
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // color type (RGBA)
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace
  
  // Add filter byte (0) at start of each row
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // filter: none
    pixels.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  
  const idatData = zlib.deflateSync(rawData);
  
  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcData = Buffer.concat([typeBuf, data]);
    
    // CRC32
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    for (let i = 0; i < crcData.length; i++) {
      crc = table[(crc ^ crcData[i]) & 0xFF] ^ (crc >>> 8);
    }
    crc = (crc ^ 0xFFFFFFFF) >>> 0;
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }
  
  const iend = Buffer.alloc(0);
  
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', iend)
  ]);
}

// Draw RingLight icon: glowing ring on dark background
function drawIcon(size) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.38;
  const innerR = size * 0.28;
  
  return function(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Background: dark warm gradient
    const bgDist = Math.min(1, dist / (size * 0.7));
    const bgR = Math.round(13 + bgDist * 8);
    const bgG = Math.round(10 + bgDist * 6);
    const bgB = Math.round(8 + bgDist * 4);
    
    // Ring glow
    if (dist >= innerR && dist <= outerR) {
      // Inside ring — bright warm light
      const t = (dist - innerR) / (outerR - innerR);
      const intensity = 1 - Math.abs(t - 0.5) * 2; // brightest in middle
      const r = Math.min(255, 255);
      const g = Math.min(255, Math.round(220 + intensity * 35));
      const b = Math.min(255, Math.round(160 + intensity * 60));
      const a = 255;
      return [r, g, b, a];
    }
    
    // Glow halo outside ring
    if (dist > outerR && dist < outerR + size * 0.08) {
      const t = (dist - outerR) / (size * 0.08);
      const alpha = Math.round((1 - t) * 120);
      return [
        Math.min(255, bgR + alpha),
        Math.min(255, bgG + Math.round(alpha * 0.85)),
        Math.min(255, bgB + Math.round(alpha * 0.6)),
        255
      ];
    }
    
    // Inner glow
    if (dist < innerR && dist > innerR - size * 0.06) {
      const t = (innerR - dist) / (size * 0.06);
      const alpha = Math.round((1 - t) * 80);
      return [
        Math.min(255, bgR + alpha),
        Math.min(255, bgG + Math.round(alpha * 0.85)),
        Math.min(255, bgB + Math.round(alpha * 0.6)),
        255
      ];
    }
    
    return [bgR, bgG, bgB, 255];
  };
}

// Generate icons
const sizes = [192, 512];
const outDir = process.argv[2] || '.';

for (const size of sizes) {
  const png = createPNG(size, size, drawIcon(size));
  const path = `${outDir}/icon-${size}.png`;
  fs.writeFileSync(path, png);
  console.log(`Generated ${path} (${(png.length / 1024).toFixed(1)} KB)`);
}

// Also generate maskable icon (with padding for safe zone)
function drawMaskableIcon(size) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.30;
  const innerR = size * 0.22;
  
  return function(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Full background fill (for maskable)
    const bgR = 13, bgG = 10, bgB = 8;
    
    if (dist >= innerR && dist <= outerR) {
      const t = (dist - innerR) / (outerR - innerR);
      const intensity = 1 - Math.abs(t - 0.5) * 2;
      return [255, Math.min(255, 220 + intensity * 35), Math.min(255, 160 + intensity * 60), 255];
    }
    
    // Halo
    if (dist > outerR && dist < outerR + size * 0.06) {
      const t = (dist - outerR) / (size * 0.06);
      const alpha = Math.round((1 - t) * 100);
      return [Math.min(255, bgR + alpha), Math.min(255, bgG + Math.round(alpha * 0.85)), Math.min(255, bgB + Math.round(alpha * 0.6)), 255];
    }
    
    return [bgR, bgG, bgB, 255];
  };
}

for (const size of sizes) {
  const png = createPNG(size, size, drawMaskableIcon(size));
  const path = `${outDir}/icon-maskable-${size}.png`;
  fs.writeFileSync(path, png);
  console.log(`Generated ${path} (${(png.length / 1024).toFixed(1)} KB)`);
}

// Apple touch icon (180x180)
const appleIcon = createPNG(180, 180, drawIcon(180));
fs.writeFileSync(`${outDir}/apple-touch-icon.png`, appleIcon);
console.log(`Generated apple-touch-icon.png (${(appleIcon.length / 1024).toFixed(1)} KB)`);

// Favicon (32x32)
const favicon = createPNG(32, 32, drawIcon(32));
fs.writeFileSync(`${outDir}/favicon-32.png`, favicon);
console.log(`Generated favicon-32.png (${(favicon.length / 1024).toFixed(1)} KB)`);

console.log('\nAll icons generated!');
