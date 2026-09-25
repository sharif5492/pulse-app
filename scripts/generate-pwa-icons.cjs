const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Utility to create a valid PNG file from raw RGBA pixel buffer
function createPNG(width, height, pixelShader) {
  // Each scanline begins with a filter type byte (0 = None) followed by width * 4 bytes (RGBA)
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelShader(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = Math.max(0, Math.min(255, Math.floor(r)));
      rawData[pixelOffset + 1] = Math.max(0, Math.min(255, Math.floor(g)));
      rawData[pixelOffset + 2] = Math.max(0, Math.min(255, Math.floor(b)));
      rawData[pixelOffset + 3] = Math.max(0, Math.min(255, Math.floor(a)));
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(calculateCRC(typeAndData), 0);

    return Buffer.concat([length, typeAndData, crc]);
  }

  function calculateCRC(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // Precompute CRC table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }

  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Shader for drawing the Pulse Glowing Heart and EKG line
function pulseIconShader(x, y, w, h, isMaskable = false) {
  const nx = (x / w) * 2 - 1; // -1 to 1
  const ny = (y / h) * 2 - 1; // -1 to 1

  // Background gradient (Deep Slate #020617 to #0f172a)
  const bgGrad = (ny + 1) * 0.5;
  let bgR = 2 + bgGrad * 12;
  let bgG = 6 + bgGrad * 15;
  let bgB = 23 + bgGrad * 30;
  let bgA = 255;

  // Outer rounded corner mask if not maskable
  if (!isMaskable) {
    const cornerRadius = 0.22;
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const dx = Math.max(0, ax - (1 - cornerRadius));
    const dy = Math.max(0, ay - (1 - cornerRadius));
    const cornerDist = Math.sqrt(dx * dx + dy * dy);
    if (cornerDist > cornerRadius) {
      return [0, 0, 0, 0];
    }
  }

  // Heart formula: (x^2 + (y - sqrt(|x|))^2 - 1)
  const scale = isMaskable ? 1.6 : 1.35;
  const hx = nx * scale;
  const hy = -(ny + 0.1) * scale; // inverted y for heart apex down

  const sqrtAbsX = Math.sqrt(Math.abs(hx));
  const heartVal = hx * hx + Math.pow(hy - sqrtAbsX, 2) - 1.0;

  // Heart color: Radiant Rose #f43f5e -> Magenta #ec4899 -> Indigo #8b5cf6
  const heartGrad = (hx + hy + 1.5) / 3.0;
  const hR = 244 * (1 - heartGrad * 0.5) + 139 * (heartGrad * 0.5);
  const hG = 63 * (1 - heartGrad * 0.3) + 92 * (heartGrad * 0.3);
  const hB = 94 * (1 - heartGrad) + 246 * heartGrad;

  // Pulse Line (EKG wave across the middle)
  const py = ny + 0.05;
  let ekgY = 0;
  if (nx > -0.65 && nx < -0.3) {
    ekgY = 0;
  } else if (nx >= -0.3 && nx < -0.15) {
    const t = (nx + 0.3) / 0.15;
    ekgY = -0.22 * Math.sin(t * Math.PI);
  } else if (nx >= -0.15 && nx < 0.05) {
    const t = (nx + 0.15) / 0.2;
    ekgY = 0.45 * Math.sin(t * Math.PI);
  } else if (nx >= 0.05 && nx < 0.2) {
    const t = (nx - 0.05) / 0.15;
    ekgY = -0.35 * Math.sin(t * Math.PI);
  } else if (nx >= 0.2 && nx < 0.32) {
    const t = (nx - 0.2) / 0.12;
    ekgY = 0.15 * Math.sin(t * Math.PI);
  }

  const distToEkg = Math.abs(py - ekgY);
  const inEkg = (nx > -0.65 && nx < 0.65) && distToEkg < 0.045;

  if (inEkg) {
    const glow = Math.max(0, 1 - distToEkg / 0.045);
    return [255, 255, 255, 255];
  }

  if (heartVal <= 0) {
    // Inside heart
    const edgeDist = Math.abs(heartVal);
    const highlight = Math.max(0, 1 - Math.sqrt(nx * nx + (ny + 0.3) * (ny + 0.3)) * 1.5);
    return [
      Math.min(255, hR + highlight * 40),
      Math.min(255, hG + highlight * 40),
      Math.min(255, hB + highlight * 40),
      255
    ];
  } else if (heartVal < 0.25) {
    // Ambient glow around heart
    const glowIntensity = Math.pow(1 - heartVal / 0.25, 2) * 0.75;
    return [
      bgR + (hR - bgR) * glowIntensity,
      bgG + (hG - bgG) * glowIntensity,
      bgB + (hB - bgB) * glowIntensity,
      255
    ];
  }

  return [bgR, bgG, bgB, bgA];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons in /public...');

// Generate 192x192
const icon192 = createPNG(192, 192, (x, y, w, h) => pulseIconShader(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
console.log('Created icon-192.png (192x192)');

// Generate 512x512
const icon512 = createPNG(512, 512, (x, y, w, h) => pulseIconShader(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
console.log('Created icon-512.png (512x512)');

// Generate maskable 192x192
const maskable192 = createPNG(192, 192, (x, y, w, h) => pulseIconShader(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-192.png'), maskable192);
console.log('Created icon-maskable-192.png');

// Generate maskable 512x512
const maskable512 = createPNG(512, 512, (x, y, w, h) => pulseIconShader(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), maskable512);
console.log('Created icon-maskable-512.png');

// Generate apple-touch-icon.png (180x180)
const appleIcon = createPNG(180, 180, (x, y, w, h) => pulseIconShader(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('Created apple-touch-icon.png (180x180)');

console.log('All PWA icons generated successfully!');
