// Minimal QR code generator (pure TypeScript, no deps).
// Implements ISO/IEC 18004 up to version 10, byte mode, error correction level L.
// Adapted for compactness; produces a boolean matrix for a given text.

type BitBuffer = { bits: number[]; length: number };

function pushBits(buf: BitBuffer, val: number, len: number) {
  for (let i = len - 1; i >= 0; i--) {
    buf.bits.push((val >> i) & 1);
    buf.length++;
  }
}

// Galois field tables for Reed-Solomon (GF(256), primitive 0x11d)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGeneratorPoly(ecLen);
  const buf = data.concat(new Array(ecLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = buf[i];
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) {
      buf[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return buf.slice(data.length);
}

// Capacity (version, byte-mode, ECC level L): data codewords (8 bits each)
// and ec codewords per block. Versions 1..10 supported.
const CAPACITY_L: { version: number; dataCodewords: number; ecPerBlock: number; blocks: number }[] = [
  { version: 1, dataCodewords: 19, ecPerBlock: 7, blocks: 1 },
  { version: 2, dataCodewords: 34, ecPerBlock: 10, blocks: 1 },
  { version: 3, dataCodewords: 55, ecPerBlock: 15, blocks: 1 },
  { version: 4, dataCodewords: 80, ecPerBlock: 20, blocks: 1 },
  { version: 5, dataCodewords: 108, ecPerBlock: 26, blocks: 1 },
  { version: 6, dataCodewords: 136, ecPerBlock: 18, blocks: 2 },
  { version: 7, dataCodewords: 156, ecPerBlock: 20, blocks: 2 },
  { version: 8, dataCodewords: 194, ecPerBlock: 24, blocks: 2 },
  { version: 9, dataCodewords: 232, ecPerBlock: 30, blocks: 2 },
  { version: 10, dataCodewords: 274, ecPerBlock: 18, blocks: 4 },
];

function chooseVersion(byteLen: number) {
  // byte mode: 4 mode bits + 8/16 length bits + data*8 + terminator (up to 4) + pad
  for (const v of CAPACITY_L) {
    const lenBits = v.version < 10 ? 8 : 16;
    const totalBits = 4 + lenBits + byteLen * 8;
    if (totalBits <= v.dataCodewords * 8) return v;
  }
  throw new Error('QR data too long (max version 10, ~274 bytes)');
}

function buildMatrix(version: number, finalCodewords: number[], ecCodewords: number[], totalCodewords: number): boolean[][] {
  const size = 17 + version * 4;
  const m: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  const setFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inner = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const isDark =
          inner &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
            (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        m[rr][cc] = isDark;
        reserved[rr][cc] = true;
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // timing patterns
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }
  // dark module
  m[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // alignment patterns for version >= 2
  const alignPos: number[] = [];
  if (version >= 2) {
    const count = Math.floor(version / 7) + 2;
    const first = 6;
    const last = size - 7;
    const step = Math.ceil((last - first) / (count - 1));
    for (let p = first; ; p += step) {
      alignPos.push(p);
      if (p >= last) break;
    }
    alignPos[alignPos.length - 1] = last;
    for (const r of alignPos) {
      for (const c of alignPos) {
        if ((r === 6 && c === 6) || (r === 6 && c === last) || (r === last && c === 6)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const rr = r + dr, cc = c + dc;
            const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            m[rr][cc] = dark;
            reserved[rr][cc] = true;
          }
        }
      }
    }
  }

  // format info placeholder reservation
  for (let i = 0; i < 8; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
  reserved[8][8] = true;

  // place codewords
  const allCodewords = finalCodewords.concat(ecCodewords);
  const bits: number[] = [];
  for (const cw of allCodewords) {
    for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
  }
  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5; // skip timing column
    for (let i = 0; i < size; i++) {
      const r = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (!reserved[r][cc]) {
          m[r][cc] = bitIdx < bits.length ? bits[bitIdx] === 1 : false;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // apply mask pattern 0 (i+j even) and format info for ECC level L
  const mask = (r: number, c: number) => (r + c) % 2 === 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && m[r][c] === true && mask(r, c)) {
        m[r][c] = false;
      } else if (!reserved[r][c] && m[r][c] === false && mask(r, c)) {
        m[r][c] = true;
      }
    }
  }

  // format info bits for ECC L, mask 0 -> 0b111011111000100
  const formatBits = '111011111000100';
  const setFormat = (rr: number, cc: number, idx: number) => {
    m[rr][cc] = formatBits[idx] === '1';
  };
  let fi = 0;
  for (let i = 0; i <= 5; i++) setFormat(8, i, fi++);
  setFormat(8, 7, fi++);
  setFormat(8, 8, fi++);
  setFormat(7, 8, fi++);
  for (let i = 5; i >= 0; i--) setFormat(i, 8, fi++);
  fi = 0;
  for (let i = 0; i < 7; i++) setFormat(size - 1 - i, 8, fi++);
  for (let i = 0; i < 8; i++) setFormat(8, size - 1 - i, fi++);

  return m.map((row) => row.map((v) => v === true));
}

export function generateQR(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  const ver = chooseVersion(bytes.length);

  const buf: BitBuffer = { bits: [], length: 0 };
  pushBits(buf, 0b0100, 4); // byte mode
  const lenBits = ver.version < 10 ? 8 : 16;
  pushBits(buf, bytes.length, lenBits);
  for (const b of bytes) pushBits(buf, b, 8);
  // terminator (up to 4 zero bits)
  const remaining = ver.dataCodewords * 8 - buf.length;
  pushBits(buf, 0, Math.min(4, remaining));
  // pad to byte boundary
  while (buf.length % 8 !== 0) pushBits(buf, 0, 1);
  // pad bytes
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (buf.length < ver.dataCodewords * 8) pushBits(buf, padBytes[pi++ % 2], 8);

  // convert to codewords
  const dataCodewords: number[] = [];
  for (let i = 0; i < buf.bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | buf.bits[i + j];
    dataCodewords.push(v);
  }

  // split into blocks, generate ec, interleave
  const ecLen = ver.ecPerBlock;
  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  const perBlock = Math.floor(ver.dataCodewords / ver.blocks);
  let offset = 0;
  for (let b = 0; b < ver.blocks; b++) {
    const block = dataCodewords.slice(offset, offset + perBlock);
    offset += perBlock;
    blocks.push(block);
    ecBlocks.push(rsEncode(block, ecLen));
  }
  // interleave data
  const finalCodewords: number[] = [];
  for (let i = 0; i < perBlock; i++) for (const b of blocks) finalCodewords.push(b[i]);
  for (let i = 0; i < ecLen; i++) for (const b of ecBlocks) finalCodewords.push(b[i]);

  const totalCodewords = ver.dataCodewords + ver.blocks * ecLen;
  return buildMatrix(ver.version, finalCodewords.slice(0, ver.dataCodewords), finalCodewords.slice(ver.dataCodewords), totalCodewords);
}

export function qrToSvgPath(matrix: boolean[][], scale: number): string {
  const size = matrix.length;
  const d: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        d.push(`M${c * scale} ${r * scale}h${scale}v${scale}h${-scale}z`);
      }
    }
  }
  return d.join(' ');
}

export function qrSize(matrix: boolean[][]): number {
  return matrix.length;
}
