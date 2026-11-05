/**
 * Self-contained QR Code Model 2, version 5, error correction L, mask 0.
 * Encodes public inventory links (up to 106 UTF-8 bytes) without sending
 * customer, inventory or session data to a third-party QR API.
 * Format bits and Reed-Solomon parity follow ISO/IEC 18004.
 */
export function qrMatrix(value: string): boolean[][] {
  const payload = new TextEncoder().encode(value);
  if (payload.length > 106) throw new Error("QR_TOO_LONG");
  const SIZE = 37, DATA = 108, ECC = 26;
  const cells: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const func: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) {
      cells[y][x] = dark; func[y][x] = true;
    }
  };

  for (let i = 0; i < SIZE; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [SIZE - 4, 3], [3, SIZE - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const radius = Math.max(Math.abs(dx), Math.abs(dy));
      set(cx + dx, cy + dy, radius !== 2 && radius !== 4);
    }
  }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const radius = Math.max(Math.abs(dx), Math.abs(dy));
    set(30 + dx, 30 + dy, radius === 2 || radius === 0);
  }
  const format = 0x77c4; // L / mask 0
  const bit = (i: number) => Boolean((format >>> i) & 1);
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(SIZE - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, SIZE - 15 + i, bit(i));
  set(8, SIZE - 8, true);

  const bits: number[] = [];
  const push = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4); push(payload.length, 8);
  for (const value of payload) push(value, 8);
  for (let i = 0; i < Math.min(4, DATA * 8 - bits.length); i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let word = 0;
    for (let j = 0; j < 8; j++) word = (word << 1) | bits[i + j];
    data.push(word);
  }
  const firstPadParity = data.length % 2;
  for (let i = data.length; i < DATA; i++) data.push(i % 2 === firstPadParity ? 0xec : 0x11);

  const mul = (a: number, b: number) => {
    let result = 0;
    for (let i = 7; i >= 0; i--) {
      result = (result << 1) ^ ((result >>> 7) * 0x11d);
      result ^= ((b >>> i) & 1) * a;
    }
    return result;
  };
  const generator = Array<number>(ECC).fill(0);
  generator[ECC - 1] = 1;
  let root = 1;
  for (let i = 0; i < ECC; i++) {
    for (let j = 0; j < ECC; j++) {
      generator[j] = mul(generator[j], root);
      if (j + 1 < ECC) generator[j] ^= generator[j + 1];
    }
    root = mul(root, 2);
  }
  const remainder = Array<number>(ECC).fill(0);
  for (const value of data) {
    const factor = value ^ remainder.shift()!;
    remainder.push(0);
    for (let i = 0; i < ECC; i++) remainder[i] ^= mul(generator[i], factor);
  }

  const words = [...data, ...remainder];
  let offset = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < SIZE; vertical++) {
      const y = ((right + 1) & 2) === 0 ? SIZE - 1 - vertical : vertical;
      for (let i = 0; i < 2; i++) {
        const x = right - i;
        if (func[y][x]) continue;
        let dark = offset < words.length * 8
          ? Boolean((words[offset >>> 3] >>> (7 - (offset & 7))) & 1)
          : false;
        if ((x + y) % 2 === 0) dark = !dark;
        cells[y][x] = dark;
        offset++;
      }
    }
  }
  return cells;
}
