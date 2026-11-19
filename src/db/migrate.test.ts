import { describe, expect, it } from "vitest";
import { checksum, listMigrationFiles } from "./migrate";

describe("migrations", () => {
  it("are numbered and ordered", async () => {
    const files = await listMigrationFiles();
    expect(files[0]).toBe("0000_foundation.sql");
    expect([...files].sort()).toEqual(files);
  });

  it("checksums ignore CRLF vs LF so Windows checkouts match CI", () => {
    expect(checksum("a\r\nb\r\n")).toBe(checksum("a\nb\n"));
    expect(checksum("a")).not.toBe(checksum("b"));
  });
});
