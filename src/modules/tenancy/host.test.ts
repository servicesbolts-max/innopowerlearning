import { describe, expect, it } from "vitest";
import { classifyHost, normalizeHost } from "./host";

const ROOT = "localhost:3000";

describe("normalizeHost", () => {
  it.each([
    ["LSETF.Localhost:3000", "lsetf.localhost"],
    ["learn.example.org.", "learn.example.org"],
    ["localhost", "localhost"],
  ])("normalizes %s", (raw, expected) => expect(normalizeHost(raw)).toBe(expected));

  it.each([
    null,
    "",
    "[::1]:3000",
    "127.0.0.1:3000",
    "bad_host.localhost",
    "a..b",
    "-x.org",
    "é.org",
  ])("rejects %s", (raw) => expect(normalizeHost(raw)).toBeNull());
});

describe("classifyHost", () => {
  it("serves the hub on the root domain and www, on any port", () => {
    expect(classifyHost("localhost:3000", ROOT)).toEqual({ surface: "hub" });
    expect(classifyHost("localhost:3100", ROOT)).toEqual({ surface: "hub" });
    expect(classifyHost("www.localhost:3000", ROOT)).toEqual({ surface: "hub" });
  });

  it("recognizes the console host", () => {
    expect(classifyHost("console.localhost:3000", ROOT)).toEqual({ surface: "console" });
  });

  it("maps one subdomain label to a tenant slug", () => {
    expect(classifyHost("gods-entrepreneurs.localhost:3100", ROOT)).toEqual({
      surface: "tenant",
      by: "slug",
      slug: "gods-entrepreneurs",
    });
  });

  it("rejects nested subdomains and reserved labels", () => {
    expect(classifyHost("a.lsetf.localhost", ROOT)).toEqual({ surface: "invalid" });
    expect(classifyHost("api.localhost", ROOT)).toEqual({ surface: "invalid" });
    expect(classifyHost("hub.localhost", ROOT)).toEqual({ surface: "invalid" });
  });

  it("treats other multi-label hosts as custom domains", () => {
    expect(classifyHost("Learn.Example.org", ROOT)).toEqual({
      surface: "tenant",
      by: "host",
      host: "learn.example.org",
    });
  });

  it("does not let a look-alike suffix pass as a subdomain", () => {
    expect(classifyHost("lsetf.evil-localhost", ROOT)).toEqual({
      surface: "tenant",
      by: "host",
      host: "lsetf.evil-localhost",
    });
    expect(classifyHost("evillocalhost", ROOT)).toEqual({ surface: "invalid" });
  });

  it("works with a production root domain", () => {
    const root = "learn.innopower.example";
    expect(classifyHost("learn.innopower.example", root)).toEqual({ surface: "hub" });
    expect(classifyHost("wvstu.learn.innopower.example", root)).toMatchObject({ slug: "wvstu" });
  });

  it("rejects missing, IP and malformed hosts", () => {
    expect(classifyHost(undefined, ROOT)).toEqual({ surface: "invalid" });
    expect(classifyHost("127.0.0.1:3000", ROOT)).toEqual({ surface: "invalid" });
    expect(classifyHost("x y.localhost", ROOT)).toEqual({ surface: "invalid" });
  });
});
