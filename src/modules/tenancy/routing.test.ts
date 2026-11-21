import { describe, expect, it, vi } from "vitest";
import type { ResolvedTenant } from "./lookup";
import { cachedResolver, decideRoute, type RouteInput, type TenantResolver } from "./routing";

const LSETF: ResolvedTenant = {
  id: "0190a1b2-0000-7000-8000-000000000001",
  slug: "lsetf",
  status: "active",
};
const PAUSED: ResolvedTenant = {
  id: "0190a1b2-0000-7000-8000-000000000002",
  slug: "paused",
  status: "suspended",
};

const resolve: TenantResolver = async (t) => {
  if (t.by === "slug") return t.slug === "lsetf" ? LSETF : t.slug === "paused" ? PAUSED : null;
  return t.host === "learn.lsetf.example" ? LSETF : null;
};

const route = (host: string, pathname: string, pathFallback = false) =>
  decideRoute(
    { host, pathname, rootDomain: "localhost:3000", pathFallback } satisfies RouteInput,
    resolve,
  );

describe("decideRoute: tenant hosts", () => {
  it("rewrites an active subdomain tenant into /t/<slug>", async () => {
    expect(await route("lsetf.localhost:3100", "/")).toEqual({
      type: "rewrite",
      pathname: "/t/lsetf",
      tenant: LSETF,
    });
    expect(await route("lsetf.localhost:3100", "/courses")).toMatchObject({
      pathname: "/t/lsetf/courses",
    });
  });

  it("rewrites a verified custom domain to its tenant", async () => {
    expect(await route("learn.lsetf.example", "/sign-in")).toMatchObject({
      pathname: "/t/lsetf/sign-in",
    });
  });

  it("refuses unknown and suspended tenants", async () => {
    expect(await route("nope.localhost:3000", "/")).toEqual({ type: "not-found" });
    expect(await route("paused.localhost:3000", "/")).toEqual({ type: "not-found" });
    expect(await route("unknown.example.org", "/")).toEqual({ type: "not-found" });
  });

  it("refuses hub-only paths and nested /t paths on a tenant host", async () => {
    for (const p of ["/design/innopower", "/partners", "/legal/terms", "/t/wvstu", "/t"]) {
      expect(await route("lsetf.localhost:3000", p), p).toEqual({ type: "not-found" });
    }
  });
});

describe("decideRoute: hub host", () => {
  it("passes hub pages through", async () => {
    for (const p of ["/", "/partners", "/sign-in", "/legal/privacy"]) {
      expect(await route("localhost:3000", p), p).toEqual({ type: "next" });
    }
  });

  it("serves /design only for the demo themes", async () => {
    expect(await route("localhost:3000", "/design/emerald")).toEqual({ type: "next" });
    expect(await route("localhost:3000", "/design/emerald/")).toEqual({ type: "next" });
    for (const p of ["/design", "/design/nope", "/design/emerald/x"]) {
      expect(await route("localhost:3000", p), p).toEqual({ type: "not-found" });
    }
  });

  it("serves the /t/<slug> fallback only when enabled, and only for active tenants", async () => {
    expect(await route("localhost:3000", "/t/lsetf")).toEqual({ type: "not-found" });
    expect(await route("localhost:3000", "/t/lsetf/courses", true)).toEqual({ type: "next" });
    expect(await route("localhost:3000", "/t/paused", true)).toEqual({ type: "not-found" });
    expect(await route("localhost:3000", "/t/hub", true)).toEqual({ type: "not-found" });
    expect(await route("localhost:3000", "/t", true)).toEqual({ type: "not-found" });
  });
});

describe("decideRoute: other hosts", () => {
  it("refuses the console (until P11) and malformed hosts", async () => {
    expect(await route("console.localhost:3000", "/")).toEqual({ type: "not-found" });
    expect(await route("a.b.localhost:3000", "/")).toEqual({ type: "not-found" });
    expect(await route("127.0.0.1:3000", "/")).toEqual({ type: "not-found" });
  });
});

describe("cachedResolver", () => {
  it("caches hits for the TTL and misses for the shorter negative TTL", async () => {
    let t = 0;
    const inner = vi.fn(resolve);
    const cached = cachedResolver(inner, { ttlMs: 100, negativeTtlMs: 10, now: () => t });
    const lsetf = { surface: "tenant", by: "slug", slug: "lsetf" } as const;
    const nope = { surface: "tenant", by: "slug", slug: "nope" } as const;
    await cached(lsetf);
    await cached(lsetf);
    await cached(nope);
    await cached(nope);
    expect(inner).toHaveBeenCalledTimes(2);
    t = 50;
    await cached(lsetf);
    await cached(nope);
    expect(inner).toHaveBeenCalledTimes(3);
    t = 200;
    await cached(lsetf);
    expect(inner).toHaveBeenCalledTimes(4);
  });

  it("evicts the oldest entry when full", async () => {
    const inner = vi.fn(resolve);
    const cached = cachedResolver(inner, { max: 1 });
    await cached({ surface: "tenant", by: "slug", slug: "a" });
    await cached({ surface: "tenant", by: "slug", slug: "b" });
    await cached({ surface: "tenant", by: "slug", slug: "a" });
    expect(inner).toHaveBeenCalledTimes(3);
  });
});
