import { describe, expect, it } from "vitest";
import { buildGroups, type GroupInputs } from "./build-rows";
import type { Snapshot } from "./snapshots";

const retry = () => {};
const ok: Snapshot = { state: "ok", lastSuccess: 10, retry };
const status = { flags: { newsRss: true, googleNews: true, minambiente: true, presidencia: true, xm: true }, ai: { configured: true, provider: "openai", webSearch: true } };

function inputs(overrides: Partial<GroupInputs> = {}): GroupInputs {
  return {
    trm: ok,
    secop: ok,
    pib: ok,
    ipc: ok,
    exports: ok,
    supersociedades: ok,
    news: { snapshot: ok, feeds: [{ id: "portafolio", outlet: "Portafolio", status: "ok", count: 4 }, { id: "google-news", outlet: "Google News", status: "error", count: 0, message: "Google News limitó las consultas." }], off: false, fetchedAt: 10 },
    regulation: { snapshot: ok, data: { minambiente: { status: "ok", items: [] }, presidencia: { status: "disabled", items: [] } }, fetchedAt: 10 },
    curatedCount: 12,
    status: { state: "ok", data: status },
    ...overrides,
  };
}

const flat = (groups: ReturnType<typeof buildGroups>) => groups.flatMap((group) => group.rows);
const find = (groups: ReturnType<typeof buildGroups>, id: string) => flat(groups).find((row) => row.entry.id === id);

describe("buildGroups", () => {
  it("lists every source of the catalog once", () => {
    const ids = flat(buildGroups(inputs())).map((row) => row.entry.id);
    expect(ids).toEqual(expect.arrayContaining(["trm", "secop", "pib", "ipc", "exports", "supersociedades", "portafolio", "larepublica", "eltiempo", "valora", "elcolombiano", "google-news", "minambiente", "presidencia", "curated", "xm", "ai"]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("maps per-feed health from /api/news", () => {
    const groups = buildGroups(inputs());
    expect(find(groups, "portafolio")?.snapshot.state).toBe("ok");
    expect(find(groups, "google-news")?.snapshot).toMatchObject({ state: "error", error: { kind: "rate_limited" } });
  });

  it("marks feeds missing from the answer as unchecked", () => {
    expect(find(buildGroups(inputs()), "larepublica")?.snapshot.state).toBe("unchecked");
  });

  it("marks every feed disabled when the news source is off", () => {
    const groups = buildGroups(inputs({ news: { snapshot: ok, feeds: [], off: true, fetchedAt: 10 } }));
    expect(find(groups, "portafolio")?.snapshot.state).toBe("disabled");
  });

  it("shows the server flag and lets it override the state", () => {
    const off = { ...status, flags: { ...status.flags, googleNews: false } };
    const groups = buildGroups(inputs({ status: { state: "ok", data: off } }));
    expect(find(groups, "google-news")).toMatchObject({ flag: false, snapshot: { state: "disabled" } });
    expect(find(groups, "minambiente")?.flag).toBe(true);
    expect(find(groups, "trm")?.flag).toBeUndefined();
  });

  it("maps the regulation blocks", () => {
    const groups = buildGroups(inputs());
    expect(find(groups, "minambiente")?.snapshot.state).toBe("empty");
    expect(find(groups, "presidencia")?.snapshot.state).toBe("disabled");
  });

  it("reports the assistant from the server status without revealing keys", () => {
    const configured = find(buildGroups(inputs()), "ai");
    expect(configured?.snapshot.state).toBe("ok");
    expect(configured?.snapshot.detail).toContain("openai");
    const missing = find(buildGroups(inputs({ status: { state: "ok", data: { ...status, ai: { configured: false, provider: "openai", webSearch: false } } } })), "ai");
    expect(missing?.snapshot).toMatchObject({ state: "disabled", error: { kind: "disabled" } });
  });

  it("keeps the assistant pending while the status loads and unchecked when it fails", () => {
    expect(find(buildGroups(inputs({ status: { state: "pending" } })), "ai")?.snapshot.state).toBe("pending");
    expect(find(buildGroups(inputs({ status: { state: "error" } })), "ai")?.snapshot.state).toBe("unchecked");
  });

  it("curated norms are always ok and show their count", () => {
    expect(find(buildGroups(inputs()), "curated")?.snapshot).toMatchObject({ state: "ok" });
    expect(find(buildGroups(inputs()), "curated")?.snapshot.detail).toContain("12");
  });

  it("falls back to the news view state when the feed answer is missing and the view failed", () => {
    const failed: Snapshot = { state: "error", error: { kind: "network", message: "x" }, retry };
    const groups = buildGroups(inputs({ news: { snapshot: failed, feeds: [], off: false } }));
    expect(find(groups, "portafolio")?.snapshot.state).toBe("error");
  });
});
