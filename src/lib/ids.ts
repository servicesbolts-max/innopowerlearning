import { randomFillSync } from "node:crypto";

/**
 * UUIDv7 (RFC 9562): 48-bit Unix milliseconds, version 7, variant 10, then random bits.
 * Ids made in the same millisecond keep their order through a 12-bit counter in rand_a.
 */
let lastMs = 0;
let counter = 0;

export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  randomFillSync(bytes);
  if (now <= lastMs) {
    counter += 1;
    if (counter > 0xfff) {
      // Counter exhausted: borrow the next millisecond, as RFC 9562 allows.
      lastMs += 1;
      counter = 0;
    }
    now = lastMs;
  } else {
    lastMs = now;
    counter = bytes[6]! & 0x07; // random start, leaving headroom
  }
  // 48-bit timestamp, big-endian. Division keeps it exact (bitwise ops are 32-bit in JS).
  for (let i = 5, rest = now; i >= 0; i--, rest = Math.floor(rest / 256)) bytes[i] = rest % 256;
  bytes[6] = 0x70 | ((counter >> 8) & 0x0f);
  bytes[7] = counter & 0xff;
  bytes[8] = 0x80 | (bytes[8]! & 0x3f);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
