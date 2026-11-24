// news-image-20261124: a newspaper front page drawn entirely in code.
// Node 22, standard library only. Writes $MAKEFUN_OUTPUT_DIR/entry.png
// (or /output/entry.png). Deterministic: no clock, no randomness.
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font, designed in this file. Each glyph is 7 rows of 5 bits.
// A row value is a bitmask, bit 4 = leftmost column.
// ---------------------------------------------------------------------------
const FONT = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  'A': [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
  'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
  'D': [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
  'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
  'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
  'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F],
  'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
  'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
  'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
  'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
  'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
  'Q': [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
  'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
  'S': [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E],
  'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
  'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
  'Y': [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
  'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
  'a': [0x00, 0x00, 0x0E, 0x01, 0x0F, 0x11, 0x0F],
  'b': [0x10, 0x10, 0x1E, 0x11, 0x11, 0x11, 0x1E],
  'c': [0x00, 0x00, 0x0E, 0x11, 0x10, 0x11, 0x0E],
  'd': [0x01, 0x01, 0x0F, 0x11, 0x11, 0x11, 0x0F],
  'e': [0x00, 0x00, 0x0E, 0x11, 0x1F, 0x10, 0x0E],
  'f': [0x06, 0x08, 0x08, 0x1E, 0x08, 0x08, 0x08],
  'g': [0x00, 0x0E, 0x11, 0x11, 0x0F, 0x01, 0x0E],
  'h': [0x10, 0x10, 0x1E, 0x11, 0x11, 0x11, 0x11],
  'i': [0x04, 0x00, 0x0C, 0x04, 0x04, 0x04, 0x0E],
  'j': [0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0C],
  'k': [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  'l': [0x0C, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
  'm': [0x00, 0x00, 0x1A, 0x15, 0x15, 0x15, 0x15],
  'n': [0x00, 0x00, 0x1E, 0x11, 0x11, 0x11, 0x11],
  'o': [0x00, 0x00, 0x0E, 0x11, 0x11, 0x11, 0x0E],
  'p': [0x00, 0x00, 0x1E, 0x11, 0x11, 0x1E, 0x10],
  'q': [0x00, 0x00, 0x0F, 0x11, 0x11, 0x0F, 0x01],
  'r': [0x00, 0x00, 0x16, 0x19, 0x10, 0x10, 0x10],
  's': [0x00, 0x00, 0x0F, 0x10, 0x0E, 0x01, 0x1E],
  't': [0x08, 0x08, 0x1E, 0x08, 0x08, 0x09, 0x06],
  'u': [0x00, 0x00, 0x11, 0x11, 0x11, 0x13, 0x0D],
  'v': [0x00, 0x00, 0x11, 0x11, 0x11, 0x0A, 0x04],
  'w': [0x00, 0x00, 0x11, 0x15, 0x15, 0x15, 0x0A],
  'x': [0x00, 0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11],
  'y': [0x00, 0x00, 0x11, 0x11, 0x0F, 0x01, 0x0E],
  'z': [0x00, 0x00, 0x1F, 0x02, 0x04, 0x08, 0x1F],
  '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
  '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
  '2': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F],
  '3': [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E],
  '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
  '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
  '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
  '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
  '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0C],
  ',': [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  '-': [0x00, 0x00, 0x00, 0x0E, 0x00, 0x00, 0x00],
  ':': [0x00, 0x0C, 0x00, 0x00, 0x00, 0x0C, 0x00],
  ';': [0x00, 0x0C, 0x00, 0x00, 0x00, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  '?': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '$': [0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  '&': [0x0C, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0D],
  '"': [0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00],
  '+': [0x00, 0x04, 0x04, 0x0E, 0x04, 0x04, 0x00],
  '=': [0x00, 0x00, 0x1F, 0x00, 0x1F, 0x00, 0x00],
};

// ---------------------------------------------------------------------------
// Framebuffer and drawing primitives
// ---------------------------------------------------------------------------
const PAPER = [246, 241, 231];
const INK = [26, 26, 26];
const RED = [176, 42, 48];
const BLUE = [31, 58, 95];
const MIDBLUE = [74, 110, 150];
const LIGHTBLUE = [196, 214, 232];
const GREY = [128, 122, 110];
const TAN = [214, 200, 168];
const GREEN = [46, 110, 70];
const GOLD = [198, 148, 52];

const px = new Uint8Array(W * H * 3);

function fillAll(c) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2];
  }
}

function setPixel(x, y, c) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function fillRect(x, y, w, h, c) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
    }
  }
}

function hline(x0, x1, y, c, t) {
  fillRect(x0, y, x1 - x0, t, c);
}

function vline(x, y0, y1, c, t) {
  fillRect(x, y0, t, y1 - y0, c);
}

// Bresenham line.
function line(x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function circle(cx, cy, r, c) {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    setPixel(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}

function fillCircle(cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let xx = cx - dx; xx <= cx + dx; xx++) setPixel(xx, cy + dy, c);
  }
}

function ellipse(cx, cy, rx, ry, c) {
  for (let a = 0; a < 360; a += 1) {
    const t = (a * Math.PI) / 180;
    setPixel(Math.round(cx + rx * Math.cos(t)), Math.round(cy + ry * Math.sin(t)), c);
  }
}

// Filled triangle by scanlines.
function fillTriangle(x0, y0, x1, y1, x2, y2, c) {
  const minY = Math.max(0, Math.min(y0, y1, y2));
  const maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    const edges = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length >= 2) {
      const xa = Math.max(0, Math.floor(Math.min(...xs)));
      const xb = Math.min(W - 1, Math.ceil(Math.max(...xs)));
      for (let x = xa; x <= xb; x++) setPixel(x, y, c);
    }
  }
}

function rectOutline(x, y, w, h, c, t) {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

// ---------------------------------------------------------------------------
// Text rendering
// ---------------------------------------------------------------------------
function textWidth(s, scale) {
  return s.length * 6 * scale - scale;
}

function drawChar(x, y, ch, scale, c) {
  const g = FONT[ch] || FONT[' '];
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row & (1 << (4 - col))) {
        fillRect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawText(x, y, s, scale, c) {
  for (let i = 0; i < s.length; i++) {
    drawChar(x + i * 6 * scale, y, s[i], scale, c);
  }
}

function drawTextCentered(cx, y, s, scale, c) {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

// Greedy word wrap to a pixel width. Returns an array of lines.
function wrapText(s, maxW, scale) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, scale) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder (8-bit RGB, filter 0, zlib deflate)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Illustrations. Each draws inside the box (x, y, w, h).
// ---------------------------------------------------------------------------

// 1. Satellite in orbit over a dark sky.
function drawSatellite(x, y, w, h) {
  fillRect(x, y, w, h, [24, 38, 64]);
  const stars = [[8, 10], [30, 26], [52, 8], [70, 34], [18, 46], [88, 14], [100, 44], [44, 58], [112, 26], [126, 52], [140, 12], [156, 40], [170, 20], [186, 48], [200, 16], [216, 38], [60, 70], [150, 62]];
  for (const [sx, sy] of stars) {
    if (sx < w && sy < h) { setPixel(x + sx, y + sy, [255, 255, 255]); setPixel(x + sx + 1, y + sy, [255, 255, 255]); }
  }
  ellipse(x + Math.floor(w / 2), y + Math.floor(h / 2) + 6, 108, 34, [120, 150, 190]);
  ellipse(x + Math.floor(w / 2), y + Math.floor(h / 2) + 6, 104, 31, [120, 150, 190]);
  const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2) - 4;
  // Solar panels.
  fillRect(cx - 78, cy - 8, 52, 16, MIDBLUE);
  fillRect(cx + 26, cy - 8, 52, 16, MIDBLUE);
  for (let i = 0; i < 5; i++) vline(cx - 68 + i * 10, cy - 8, cy + 8, [24, 38, 64], 1);
  for (let i = 0; i < 5; i++) vline(cx + 36 + i * 10, cy - 8, cy + 8, [24, 38, 64], 1);
  // Body.
  fillRect(cx - 26, cy - 14, 52, 28, [200, 200, 205]);
  rectOutline(cx - 26, cy - 14, 52, 28, INK, 1);
  fillRect(cx - 12, cy - 6, 24, 12, GOLD);
  // Antenna and dish.
  line(cx + 8, cy - 14, cx + 22, cy - 30, [220, 220, 220]);
  fillCircle(cx + 23, cy - 31, 3, RED);
  fillCircle(cx - 32, cy + 20, 4, [255, 255, 255]);
}

// 2. Oil derrick and a barrel.
function drawOil(x, y, w, h) {
  fillRect(x, y, w, h, [232, 222, 198]);
  fillCircle(x + w - 26, y + 22, 16, GOLD);
  // Derrick tower.
  line(x + 40, y + h - 8, x + 66, y + 10, INK);
  line(x + 92, y + h - 8, x + 66, y + 10, INK);
  line(x + 47, y + h - 26, x + 85, y + h - 26, INK);
  line(x + 52, y + h - 44, x + 80, y + h - 44, INK);
  line(x + 57, y + h - 60, x + 75, y + h - 60, INK);
  fillRect(x + 60, y + 4, 12, 10, RED);
  // Ground and barrel.
  fillRect(x, y + h - 8, w, 8, [120, 100, 70]);
  fillRect(x + w - 62, y + h - 44, 34, 36, [60, 60, 66]);
  fillRect(x + w - 62, y + h - 36, 34, 3, [150, 150, 155]);
  fillRect(x + w - 62, y + h - 22, 34, 3, [150, 150, 155]);
  // Pump jack arm.
  line(x + 120, y + h - 40, x + 160, y + h - 62, INK);
  fillRect(x + 156, y + h - 66, 8, 8, RED);
}

// 3. City skyline under a sun.
function drawSkyline(x, y, w, h) {
  fillRect(x, y, w, h, [226, 232, 238]);
  fillCircle(x + w - 24, y + 20, 13, GOLD);
  const base = y + h - 6;
  const b1 = [x + 6, base - 46, 30, 46];
  const b2 = [x + 40, base - 64, 26, 64];
  const b3 = [x + 70, base - 38, 30, 38];
  const b4 = [x + 104, base - 56, 26, 56];
  const b5 = [x + 134, base - 42, 28, 42];
  for (const [bx, by, bw, bh] of [b1, b2, b3, b4, b5]) {
    fillRect(bx, by, bw, bh, [70, 80, 96]);
    for (let wy = by + 8; wy < base - 6; wy += 12) {
      for (let wx = bx + 5; wx < bx + bw - 5; wx += 9) {
        fillRect(wx, wy, 4, 5, [250, 220, 120]);
      }
    }
  }
  fillRect(x, base, w, 6, [90, 96, 84]);
}

// 4. A medicine capsule and a rising chart arrow, laid out to fit any box.
function drawPill(x, y, w, h) {
  fillRect(x, y, w, h, [238, 240, 244]);
  // Capsule on the left, centred vertically.
  const cx = x + 8, cy = y + Math.floor(h / 2) - 10;
  const half = 52;
  fillRect(cx + 10, cy, half, 20, RED);
  fillRect(cx + 10 + half, cy, half, 20, [250, 250, 250]);
  fillCircle(cx + 10, cy + 10, 10, RED);
  fillCircle(cx + 10 + half * 2, cy + 10, 10, [250, 250, 250]);
  rectOutline(cx, cy - 1, half * 2 + 21, 22, INK, 1);
  // Rising arrow chart on the right, kept inside the box.
  const ax = cx + half * 2 + 34, ay = y + h - 6;
  const top = y + 6;
  const x1 = ax + Math.floor((w - (ax - x) - 8) * 0.35);
  const x2 = ax + Math.floor((w - (ax - x) - 8) * 0.65);
  const x3 = x + w - 10;
  const y1 = ay - Math.floor((ay - top) * 0.35);
  const y2 = ay - Math.floor((ay - top) * 0.55);
  line(ax, ay, x1, y1, GREEN);
  line(x1, y1, x2, y2, GREEN);
  line(x2, y2, x3, top + 4, GREEN);
  line(x3, top + 4, x3, top + 14, GREEN);
  line(x3, top + 4, x3 - 10, top + 4, GREEN);
  fillCircle(x3, top + 4, 3, GREEN);
}

// 5. A quadcopter drone over mountains, laid out to fit any box.
function drawDrone(x, y, w, h) {
  fillRect(x, y, w, h, [220, 230, 238]);
  // Mountains.
  fillTriangle(x, y + h, x + Math.floor(w * 0.22), y + h - Math.floor(h * 0.45), x + Math.floor(w * 0.45), y + h, [90, 110, 90]);
  fillTriangle(x + Math.floor(w * 0.32), y + h, x + Math.floor(w * 0.58), y + h - Math.floor(h * 0.62), x + Math.floor(w * 0.85), y + h, [70, 92, 74]);
  fillTriangle(x + Math.floor(w * 0.7), y + h, x + Math.floor(w * 0.88), y + h - Math.floor(h * 0.4), x + w, y + h, [90, 110, 90]);
  fillCircle(x + w - 22, y + 12, 9, GOLD);
  // Drone body and arms.
  const cx = x + Math.floor(w / 2), cy = y + Math.floor(h * 0.32);
  const arm = Math.floor(w * 0.17);
  line(cx - arm, cy - 6, cx + arm, cy + 6, INK);
  line(cx - arm, cy + 6, cx + arm, cy - 6, INK);
  fillRect(cx - 11, cy - 5, 22, 10, [50, 50, 56]);
  for (const [rx, ry] of [[cx - arm, cy - 6], [cx + arm, cy + 6], [cx - arm, cy + 6], [cx + arm, cy - 6]]) {
    fillCircle(rx, ry, 3, RED);
    hline(rx - 10, rx + 10, ry - 5, INK, 2);
  }
  fillCircle(cx, cy + 10, 3, BLUE);
}

// 6. A jet and radar arcs, laid out to fit any box.
function drawJet(x, y, w, h) {
  fillRect(x, y, w, h, [226, 232, 240]);
  // Radar arcs from the lower left.
  const radii = [Math.floor(h * 0.32), Math.floor(h * 0.55), Math.floor(h * 0.78), Math.floor(h * 0.98)];
  for (const r of radii) {
    for (let a = 270; a <= 360; a += 2) {
      const t = (a * Math.PI) / 180;
      setPixel(Math.round(x + 10 + r * Math.cos(t)), Math.round(y + h - 6 + r * Math.sin(t)), MIDBLUE);
    }
  }
  // Jet silhouette, flying right. Fuselage is one long thin triangle;
  // wings are separate swept triangles so the shape stays readable.
  const jx = x + Math.floor(w * 0.3), jy = y + Math.floor(h * 0.28);
  const len = Math.floor(w * 0.42);
  // Contrails from the tail.
  line(jx - 2, jy + 6, jx - Math.floor(w * 0.14), jy + 4, [180, 190, 200]);
  line(jx - 2, jy + 12, jx - Math.floor(w * 0.12), jy + 14, [180, 190, 200]);
  // Fuselage: nose right, tail left.
  fillTriangle(jx, jy, jx + len, jy + 9, jx, jy + 18, BLUE);
  // Upper swept wing.
  fillTriangle(jx + Math.floor(len * 0.38), jy + 4, jx + Math.floor(len * 0.52), jy - Math.floor(h * 0.24), jx + Math.floor(len * 0.66), jy + 4, BLUE);
  // Lower swept wing.
  fillTriangle(jx + Math.floor(len * 0.38), jy + 14, jx + Math.floor(len * 0.52), jy + Math.floor(h * 0.62), jx + Math.floor(len * 0.66), jy + 14, BLUE);
  // Tail fin.
  fillTriangle(jx + 2, jy + 2, jx + 12, jy - Math.floor(h * 0.16), jx + 20, jy + 2, BLUE);
  // Cockpit window.
  fillCircle(jx + Math.floor(len * 0.82), jy + 9, 3, [255, 255, 255]);
}

// ---------------------------------------------------------------------------
// Story block layout
// ---------------------------------------------------------------------------
const MARGIN = 28;
const PAGE_W = W - MARGIN * 2;

function drawStoryBlock(x, y, w, h, kicker, headline, summary, art) {
  drawText(x, y, kicker, 2, RED);
  const headLines = wrapText(headline, w, 3);
  let ty = y + 20;
  for (const ln of headLines) {
    drawText(x, ty, ln, 3, INK);
    ty += 24;
  }
  ty += 4;
  const sumLines = wrapText(summary, w, 2);
  for (const ln of sumLines) {
    drawText(x, ty, ln, 2, [52, 52, 48]);
    ty += 16;
  }
  const artH = y + h - ty - 6;
  if (art && artH >= 34) {
    const ah = Math.min(artH, 96);
    art(x, ty + 4, w, ah);
  }
}

function rule(y, c, t) {
  hline(MARGIN, W - MARGIN, y, c, t);
}

function drawPage() {
  fillAll(PAPER);

  // Masthead.
  drawTextCentered(W / 2, 26, 'THE WORLD IN ONE PAGE', 5, INK);
  hline(MARGIN, W - MARGIN, 74, INK, 2);
  drawTextCentered(W / 2, 84, 'TUESDAY 24 NOVEMBER 2026', 3, INK);
  hline(MARGIN, W - MARGIN, 114, RED, 3);
  hline(MARGIN, W - MARGIN, 119, INK, 1);

  // Lead story: NATO and space.
  drawText(MARGIN, 134, 'SPACE', 2, RED);
  const leadHead = wrapText('NATO VOWS TO DEFEND AGAINST SPACE THREATS', 600, 4);
  let ty = 154;
  for (const ln of leadHead) {
    drawText(MARGIN, ty, ln, 4, INK);
    ty += 30;
  }
  ty += 6;
  const leadSum = wrapText(
    'NATO chief Mark Rutte said the alliance will defend against any threat in space, after reports that Russia may launch a nuclear-armed satellite within 60 days.',
    600, 2);
  for (const ln of leadSum) {
    drawText(MARGIN, ty, ln, 2, [52, 52, 48]);
    ty += 16;
  }
  drawSatellite(664, 134, 332, 218);
  rule(368, INK, 1);

  // Row 2: Iraq oil and Gaza.
  const colW = Math.floor((PAGE_W - 24) / 2);
  drawStoryBlock(MARGIN, 384, colW, 250, 'IRAQ',
    'IRAQ PM ORDERS TAKEOVER OF KURDISH OILFIELDS',
    "Baghdad ordered the federal oil ministry to take over oilfields in Kurdish-held areas, deepening tensions with the region.",
    drawOil);
  vline(MARGIN + colW + 12, 384, 634, GREY, 1);
  drawStoryBlock(MARGIN + colW + 24, 384, colW, 250, 'GAZA',
    'ISRAELI STRIKES KILL SIX IN GAZA, OFFICIALS SAY',
    'Israeli airstrikes killed at least six Palestinians, including two police officers, in Gaza on Tuesday, officials said.',
    drawSkyline);
  rule(650, INK, 1);

  // Row 3: Sanofi, El Chapo Isidro, Russian jets.
  const col3 = Math.floor((PAGE_W - 48) / 3);
  drawStoryBlock(MARGIN, 666, col3, 196, 'BUSINESS',
    'SANOFI TO BUY INSMED FOR $41BN',
    'Sanofi will buy US biotech Insmed for $41bn in cash to grow its respiratory drugs.',
    drawPill);
  vline(MARGIN + col3 + 12, 666, 862, GREY, 1);
  drawStoryBlock(MARGIN + col3 + 24, 666, col3, 196, 'MEXICO',
    'US DRONE HELPED CATCH EL CHAPO',
    'A US drone helped capture cartel figure El Chapo Isidro in Sinaloa. Mexico will try him, despite a US extradition request.',
    drawDrone);
  vline(MARGIN + col3 * 2 + 36, 666, 862, GREY, 1);
  drawStoryBlock(MARGIN + col3 * 2 + 48, 666, col3, 196, 'KOREA',
    'RUSSIAN JETS IN KOREAN AIR ZONE',
    'South Korea said several Russian aircraft entered its air defence zone over waters near Japan.',
    drawJet);
  rule(878, INK, 1);

  // Also today panel.
  drawText(MARGIN, 890, 'ALSO TODAY', 2, RED);
  const items = [
    "Germany first to access Ukraine's Delta battlefield system.",
    'Fighting near a hospital in DR Congo traps Ebola responders.',
    'A 5.6 magnitude earthquake struck Nepal near the China border.',
    "A car bomb hit the governor's office in Villavicencio, Colombia.",
    'China sentenced an official to death for spying for a foreign country.',
    "Pakistan's Zeeshan Ali to be first foreign astronaut on Tiangong station.",
  ];
  const itemW = Math.floor((PAGE_W - 24) / 2);
  for (let i = 0; i < items.length; i++) {
    const ix = MARGIN + (i % 2) * (itemW + 24);
    const iy = 912 + Math.floor(i / 2) * 28;
    drawText(ix, iy, '*', 2, RED);
    const lines = wrapText(items[i], itemW - 16, 2);
    let ly = iy;
    for (const ln of lines) {
      drawText(ix + 16, ly, ln, 2, [52, 52, 48]);
      ly += 14;
    }
  }
  hline(MARGIN, W - MARGIN, 1004, INK, 2);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
drawPage();
const png = encodePNG();
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
