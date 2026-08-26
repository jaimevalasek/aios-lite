'use strict';

/**
 * PNG pixel statistics — the instrument static telemetry cannot be.
 *
 * A stylesheet can carry every premium technique while the page paints three
 * viewports of ground around one faint ring; DOM sampling cannot see that
 * either (a tinted section or a pseudo-element counts as "painted" whatever
 * the eye gets). Pixels can. This module decodes the PNG a browser screenshot
 * returns — 8-bit greyscale, RGB or RGBA, non-interlaced, the only shapes
 * Playwright/Chromium produce — and answers one question per fold: what share
 * of the pixels differs from the dominant page color enough to be seen.
 *
 * Dependency-free on purpose (zlib is Node's); a decoder for a screenshot is
 * ~100 lines, and a real number beats a guessed one.
 */

const zlib = require('node:zlib');

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * @param {Buffer} buffer a PNG file
 * @returns {{width: number, height: number, channels: number, data: Buffer}} unfiltered samples, row-major
 */
function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 33 || !buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a PNG');
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) throw new Error('truncated PNG chunk');
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(start);
      height = buffer.readUInt32BE(start + 4);
      bitDepth = buffer[start + 8];
      colorType = buffer[start + 9];
      interlace = buffer[start + 12];
    } else if (type === 'IDAT') {
      idat.push(buffer.subarray(start, end));
    } else if (type === 'IEND') {
      break;
    }
    offset = end + 4; // skip CRC
  }
  if (!width || !height) throw new Error('PNG without IHDR');
  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth}`);
  if (interlace !== 0) throw new Error('interlaced PNG is not supported');
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported PNG color type ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = Buffer.alloc(stride * height);
  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src];
    src += 1;
    const rowStart = y * stride;
    const prevStart = rowStart - stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[src + x];
      const left = x >= channels ? data[rowStart + x - channels] : 0;
      const up = y > 0 ? data[prevStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? data[prevStart + x - channels] : 0;
      let out;
      switch (filter) {
        case 0: out = value; break;
        case 1: out = value + left; break;
        case 2: out = value + up; break;
        case 3: out = value + ((left + up) >> 1); break;
        case 4: out = value + paeth(left, up, upLeft); break;
        default: throw new Error(`unknown PNG filter ${filter}`);
      }
      data[rowStart + x] = out & 0xff;
    }
    src += stride;
  }
  return { width, height, channels, data };
}

function rgbAt(image, index) {
  const { channels, data } = image;
  const base = index * channels;
  if (channels === 1 || channels === 2) return [data[base], data[base], data[base]];
  return [data[base], data[base + 1], data[base + 2]];
}

/**
 * Share of visible pixels that read as content rather than page ground.
 *
 * The ground is the mode of a coarse 16-level histogram (the page color, in
 * practice). A pixel counts as content when either
 *   - its RGB distance from the ground exceeds `threshold` — a photograph on a
 *     pale page, black type, a painted panel; or
 *   - it sits on texture: the summed channel difference to the next sample to
 *     the right and below exceeds `texture` — a dark photograph on a dark
 *     ground, grain, glyph edges. Low-key imagery never leaves the ground by
 *     distance and still fills the fold to the eye.
 * A faint ring, a smooth near-ground gradient or a tinted section fails both
 * tests, which is exactly what makes them read as emptiness.
 *
 * @param {{width: number, height: number, channels: number, data: Buffer}} image
 * @param {{step?: number, threshold?: number, texture?: number, top?: number, height?: number}} [options] `top`/`height` bound a horizontal band
 */
function contentShare(image, { step = 2, threshold = 40, texture = 24, top = 0, height = null } = {}) {
  const rows = height === null ? image.height - top : Math.min(image.height - top, height);
  if (rows <= 0 || image.width <= 0) return { content_pct: 0, sampled: 0, ground: null };
  const histogram = new Map();
  let sampled = 0;
  for (let y = top; y < top + rows; y += step) {
    for (let x = 0; x < image.width; x += step) {
      const [r, g, b] = rgbAt(image, y * image.width + x);
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      histogram.set(key, (histogram.get(key) || 0) + 1);
      sampled += 1;
    }
  }
  let modeKey = 0;
  let modeCount = -1;
  for (const [key, count] of histogram) if (count > modeCount) { modeKey = key; modeCount = count; }
  // The mode bucket's center is the ground; measure distance from it.
  const ground = [((modeKey >> 8) & 0xf) * 16 + 8, ((modeKey >> 4) & 0xf) * 16 + 8, (modeKey & 0xf) * 16 + 8];
  const bottom = top + rows;
  let content = 0;
  for (let y = top; y < bottom; y += step) {
    for (let x = 0; x < image.width; x += step) {
      const [r, g, b] = rgbAt(image, y * image.width + x);
      const distance = Math.sqrt((r - ground[0]) ** 2 + (g - ground[1]) ** 2 + (b - ground[2]) ** 2);
      if (distance > threshold) { content += 1; continue; }
      let variation = 0;
      if (x + step < image.width) {
        const [r2, g2, b2] = rgbAt(image, y * image.width + x + step);
        variation = Math.max(variation, Math.abs(r - r2) + Math.abs(g - g2) + Math.abs(b - b2));
      }
      if (y + step < bottom) {
        const [r3, g3, b3] = rgbAt(image, (y + step) * image.width + x);
        variation = Math.max(variation, Math.abs(r - r3) + Math.abs(g - g3) + Math.abs(b - b3));
      }
      if (variation > texture) content += 1;
    }
  }
  return {
    content_pct: Math.round((content / sampled) * 100),
    sampled,
    ground: `#${ground.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
  };
}

/**
 * Encode 8-bit RGB pixels as a PNG (filter 0, one IDAT). Used by the suite to
 * build screenshots without a browser; small enough to live beside the decoder.
 *
 * @param {{width: number, height: number, rgb: Buffer|Uint8Array}} image
 */
function encodePngRgb({ width, height, rgb }) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset, rgb.byteLength).copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const chunk = (type, body) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed) >>> 0);
    return Buffer.concat([length, typed, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

let crcTable = null;
function crc32(buffer) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

module.exports = { decodePng, contentShare, encodePngRgb };
