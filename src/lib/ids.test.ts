import { describe, expect, it } from "vitest";
import { UUID_V7, uuidv7 } from "./ids";

describe("uuidv7", () => {
  it("has the v7 version and RFC 9562 variant", () => {
    for (let i = 0; i < 200; i++) expect(uuidv7()).toMatch(UUID_V7);
  });

  it("encodes the millisecond timestamp in the first 48 bits", () => {
    const ms = Date.UTC(2030, 0, 1);
    const id = uuidv7(ms);
    expect(parseInt(id.replace(/-/g, "").slice(0, 12), 16)).toBe(ms);
  });

  it("sorts in creation order, even within one millisecond", () => {
    const ids = Array.from({ length: 1000 }, () => uuidv7(Date.UTC(2031, 0, 1)));
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
