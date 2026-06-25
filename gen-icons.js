// Generate "补光照相机" App icons — Camera Lens + Ring Light
// Pure Node.js, no external dependencies
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPNG(width, height, drawFn) {
  const pixels = Buffer.alloc(width * height * 4);
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
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0;
    pixels.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idatData = zlib.deflateSync(rawData);
  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcData = Buffer.concat([typeBuf, data]);
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c;
    }
    for (let i = 0; i < crcData.length; i++) crc = table[(crc ^ crcData[i]) & 0xFF] ^ (crc >>> 8);
    crc = (crc ^ 0xFFFFFFFF) >>> 0;
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

// Blend helper: mix color B onto color A with alpha
function blend(ar, ag, ab, br, bg, bb, alpha) {
  return [
    Math.round(ar * (1 - alpha) + br * alpha),
    Math.round(ag * (1 - alpha) + bg * alpha),
    Math.round(ab * (1 - alpha) + bb * alpha)
  ];
}

// Smooth step function for anti-aliased edges
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Draw "补光照相机" icon: Camera lens + Ring light
function drawIcon(size, opts = {}) {
  const maskable = opts.maskable || false;
  const cx = size / 2;
  const cy = size / 2;
  // Scale factor: maskable icons need content within 80% safe zone
  const sf = maskable ? 0.78 : 1.0;

  // Ring light dimensions
  const ringMid = size * 0.36 * sf;
  const ringHalfW = size * 0.055 * sf; // half width of ring band
  const ringOuter = ringMid + ringHalfW;
  const ringInner = ringMid - ringHalfW;

  // Camera lens dimensions
  const lensBarrelR = ringInner - size * 0.01 * sf; // metallic barrel edge
  const glassR = lensBarrelR - size * 0.02 * sf;    // glass area
  const cornerR = maskable ? 0 : size * 0.22;       // rounded corner radius

  return function(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // === Rounded corner check (non-maskable) ===
    if (!maskable && cornerR > 0) {
      const halfS = size / 2;
      const cdx = Math.max(0, Math.abs(dx) - (halfS - cornerR));
      const cdy = Math.max(0, Math.abs(dy) - (halfS - cornerR));
      const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cDist > cornerR + 1) return [0, 0, 0, 0];
      if (cDist > cornerR - 1) {
        const cornerAlpha = smoothstep(cornerR + 1, cornerR - 1, cDist);
        if (cornerAlpha < 0.01) return [0, 0, 0, 0];
        // Continue drawing but set alpha at the end
        var finalAlpha = cornerAlpha;
      }
    }

    // === Background: warm dark radial gradient ===
    const bgT = Math.min(1, dist / (size * 0.55));
    let r = 26 - bgT * 14;   // #1a1410 → #080604
    let g = 20 - bgT * 12;
    let b = 16 - bgT * 10;
    r = Math.max(8, r); g = Math.max(6, g); b = Math.max(4, b);

    // Subtle top-down light
    const topL = Math.max(0, 1 - y / size) * 6;
    r += topL; g += topL * 0.75; b += topL * 0.5;

    // === Ring light outer glow halo ===
    if (dist > ringMid && dist < ringOuter + size * 0.14) {
      const glowDist = dist - ringMid;
      const glowRange = ringHalfW + size * 0.14;
      const glowT = Math.max(0, 1 - glowDist / glowRange);
      const glowAlpha = glowT * glowT * 0.75;
      [r, g, b] = blend(r, g, b, 255, 215, 140, glowAlpha);
    }

    // === Ring light inner glow (light spilling inward) ===
    if (dist < ringMid && dist > ringMid - size * 0.10) {
      const glowDist = ringMid - dist;
      const glowRange = size * 0.10;
      const glowT = Math.max(0, 1 - glowDist / glowRange);
      const glowAlpha = glowT * glowT * 0.5;
      [r, g, b] = blend(r, g, b, 255, 220, 150, glowAlpha);
    }

    // === Ring light band (bright warm light) ===
    if (dist > ringInner - 1 && dist < ringOuter + 1) {
      // Anti-aliased ring with soft edges
      const innerEdge = smoothstep(ringInner - 1.5, ringInner + 0.5, dist);
      const outerEdge = 1 - smoothstep(ringOuter - 0.5, ringOuter + 1.5, dist);
      const ringAlpha = Math.min(innerEdge, outerEdge);

      // Brightest at center of band
      const bandT = (dist - ringInner) / (ringOuter - ringInner);
      const bandIntensity = 1 - Math.abs(bandT - 0.5) * 0.3;

      const ringR = 255;
      const ringG = Math.round(225 + bandIntensity * 30);
      const ringB = Math.round(155 + bandIntensity * 70);

      [r, g, b] = blend(r, g, b, ringR, ringG, ringB, ringAlpha);
    }

    // === Camera lens barrel edge (metallic ring) ===
    if (dist > glassR - 1 && dist < lensBarrelR + 1) {
      const edgeAlpha = smoothstep(glassR - 1.5, glassR, dist) * (1 - smoothstep(lensBarrelR - 0.5, lensBarrelR + 1.5, dist));
      const edgeT = (dist - glassR) / (lensBarrelR - glassR);
      const edgeBright = 1 - Math.abs(edgeT - 0.5) * 1.5;
      const barrelR = 170 + edgeBright * 50;
      const barrelG = 155 + edgeBright * 45;
      const barrelB = 140 + edgeBright * 35;
      [r, g, b] = blend(r, g, b, barrelR, barrelG, barrelB, edgeAlpha * 0.9);
    }

    // === Camera lens glass (dark blue-black) ===
    if (dist < glassR) {
      const glassT = dist / glassR;
      // Dark blue-purple gradient: lighter center, darker edge
      let glassR_val = 28 + (1 - glassT) * 12;
      let glassG_val = 22 + (1 - glassT) * 10;
      let glassB_val = 48 + (1 - glassT) * 20;

      // Warm light contamination from ring (inner edge brighter)
      const lightContam = smoothstep(glassR, glassR - size * 0.04, dist) * 0.3;
      glassR_val += lightContam * 80;
      glassG_val += lightContam * 65;
      glassB_val += lightContam * 40;

      r = Math.min(255, glassR_val);
      g = Math.min(255, glassG_val);
      b = Math.min(255, glassB_val);

      // === Lens highlight (light reflection - upper left) ===
      const hlx = cx - glassR * 0.32;
      const hly = cy - glassR * 0.32;
      const hlDist = Math.sqrt((x - hlx) * (x - hlx) + (y - hly) * (y - hly));
      const hlR = glassR * 0.28;
      if (hlDist < hlR) {
        const hlT = 1 - hlDist / hlR;
        const hlAlpha = hlT * hlT * 0.35;
        [r, g, b] = blend(r, g, b, 255, 240, 210, hlAlpha);
      }

      // Smaller bright specular highlight
      const spx = cx - glassR * 0.28;
      const spy = cy - glassR * 0.28;
      const spDist = Math.sqrt((x - spx) * (x - spx) + (y - spy) * (y - spy));
      const spR = glassR * 0.10;
      if (spDist < spR) {
        const spT = 1 - spDist / spR;
        const spAlpha = spT * spT * 0.6;
        [r, g, b] = blend(r, g, b, 255, 250, 230, spAlpha);
      }

      // === Aperture hint (subtle hexagon outline) ===
      const apothem = glassR * 0.45;
      const angle = Math.atan2(dy, dx);
      // Distance to hexagon edge
      const hexAngle = ((angle + Math.PI) % (Math.PI / 3)) - Math.PI / 6;
      const hexDist = apothem / Math.cos(hexAngle);
      if (Math.abs(dist - hexDist) < 1.5 && dist < apothem * 1.15) {
        const apAlpha = smoothstep(1.5, 0, Math.abs(dist - hexDist)) * 0.15;
        [r, g, b] = blend(r, g, b, 255, 210, 140, apAlpha);
      }

      // === Center pupil (darkest point) ===
      const pupilR = glassR * 0.22;
      if (dist < pupilR) {
        const pupilT = 1 - dist / pupilR;
        const pupilAlpha = pupilT * 0.7;
        [r, g, b] = blend(r, g, b, 3, 2, 6, pupilAlpha);
      }
    }

    // Apply corner alpha if needed
    const alpha = (typeof finalAlpha !== 'undefined') ? Math.round(255 * finalAlpha) : 255;
    return [Math.round(Math.max(0, Math.min(255, r))), Math.round(Math.max(0, Math.min(255, g))), Math.round(Math.max(0, Math.min(255, b))), alpha];
  };
}

// === Generate all icon sizes ===
const outDir = process.argv[2] || '.';

// Standard icons
for (const size of [192, 512]) {
  const png = createPNG(size, size, drawIcon(size));
  const p = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(p, png);
  console.log(`✓ icon-${size}.png (${(png.length / 1024).toFixed(1)} KB)`);
}

// Maskable icons (with safe zone padding)
for (const size of [192, 512]) {
  const png = createPNG(size, size, drawIcon(size, { maskable: true }));
  const p = path.join(outDir, `icon-maskable-${size}.png`);
  fs.writeFileSync(p, png);
  console.log(`✓ icon-maskable-${size}.png (${(png.length / 1024).toFixed(1)} KB)`);
}

// Apple touch icon (180x180)
const appleIcon = createPNG(180, 180, drawIcon(180));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), appleIcon);
console.log(`✓ apple-touch-icon.png (${(appleIcon.length / 1024).toFixed(1)} KB)`);

// Favicon (32x32)
const favicon = createPNG(32, 32, drawIcon(32));
fs.writeFileSync(path.join(outDir, 'favicon-32.png'), favicon);
console.log(`✓ favicon-32.png (${(favicon.length / 1024).toFixed(1)} KB)`);

// Favicon 16x16
const favicon16 = createPNG(16, 16, drawIcon(16));
fs.writeFileSync(path.join(outDir, 'favicon-16.png'), favicon16);
console.log(`✓ favicon-16.png (${(favicon16.length / 1024).toFixed(1)} KB)`);

// === Feature Graphic for Google Play (1024x500) ===
function drawFeatureGraphic(w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const baseSize = Math.min(w, h);
  const ringMid = baseSize * 0.28;
  const ringHalfW = baseSize * 0.035;
  const ringOuter = ringMid + ringHalfW;
  const ringInner = ringMid - ringHalfW;
  const lensBarrelR = ringInner - baseSize * 0.01;
  const glassR = lensBarrelR - baseSize * 0.015;

  return function(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Background: dark warm gradient
    const bgT = Math.min(1, dist / (w * 0.6));
    let r = 22 - bgT * 12;
    let g = 16 - bgT * 10;
    let b = 13 - bgT * 8;

    // Glow halo
    if (dist > ringMid && dist < ringOuter + baseSize * 0.12) {
      const glowDist = dist - ringMid;
      const glowRange = ringHalfW + baseSize * 0.12;
      const glowT = Math.max(0, 1 - glowDist / glowRange);
      const glowAlpha = glowT * glowT * 0.6;
      r = Math.min(255, r + 255 * glowAlpha);
      g = Math.min(255, g + 215 * glowAlpha);
      b = Math.min(255, b + 140 * glowAlpha);
    }

    // Ring band
    if (dist > ringInner - 1 && dist < ringOuter + 1) {
      const innerEdge = smoothstep(ringInner - 1.5, ringInner + 0.5, dist);
      const outerEdge = 1 - smoothstep(ringOuter - 0.5, ringOuter + 1.5, dist);
      const ringAlpha = Math.min(innerEdge, outerEdge);
      const bandT = (dist - ringInner) / (ringOuter - ringInner);
      const intensity = 1 - Math.abs(bandT - 0.5) * 0.3;
      r = Math.round(r * (1 - ringAlpha) + 255 * ringAlpha);
      g = Math.round(g * (1 - ringAlpha) + (225 + intensity * 30) * ringAlpha);
      b = Math.round(b * (1 - ringAlpha) + (155 + intensity * 70) * ringAlpha);
    }

    // Lens
    if (dist < glassR) {
      const glassT = dist / glassR;
      r = 28 + (1 - glassT) * 12;
      g = 22 + (1 - glassT) * 10;
      b = 48 + (1 - glassT) * 20;
      // Highlight
      const hlx = cx - glassR * 0.32, hly = cy - glassR * 0.32;
      const hlDist = Math.sqrt((x - hlx) * (x - hlx) + (y - hly) * (y - hly));
      if (hlDist < glassR * 0.28) {
        const hlT = 1 - hlDist / (glassR * 0.28);
        const hlA = hlT * hlT * 0.35;
        r = Math.round(r * (1 - hlA) + 255 * hlA);
        g = Math.round(g * (1 - hlA) + 240 * hlA);
        b = Math.round(b * (1 - hlA) + 210 * hlA);
      }
    } else if (dist >= glassR && dist < lensBarrelR) {
      const eT = (dist - glassR) / (lensBarrelR - glassR);
      const eB = 1 - Math.abs(eT - 0.5) * 1.5;
      r = 170 + eB * 50; g = 155 + eB * 45; b = 140 + eB * 35;
    }

    return [Math.round(Math.max(0, Math.min(255, r))), Math.round(Math.max(0, Math.min(255, g))), Math.round(Math.max(0, Math.min(255, b))), 255];
  };
}

const featureGraphic = createPNG(1024, 500, drawFeatureGraphic(1024, 500));
fs.writeFileSync(path.join(outDir, 'feature-graphic.png'), featureGraphic);
console.log(`✓ feature-graphic.png (${(featureGraphic.length / 1024).toFixed(1)} KB)`);

console.log('\n✅ All icons and graphics generated!');
