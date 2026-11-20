import { describe, expect, it } from "vitest";
import { requireQueryData } from "@/lib/query-data";

describe("Data outage handling", () => {
  it("rejects a failed response instead of interpreting it as an empty table", () => {
    expect(() => requireQueryData({ data: [], error: { message: "Cloud paused" } })).toThrow();
  });
  it("rejects a missing response", () => {
    expect(() => requireQueryData({ data: null, error: null })).toThrow();
  });
  it("accepts a genuinely empty table", () => {
    expect(requireQueryData({ data: [], error: null })).toEqual([]);
  });
  it("returns real data unchanged", () => {
    const rows = [{ id: "rescue-2026-10-16", megmentett_kg: 24 }];
    expect(requireQueryData({ data: rows, error: null })).toBe(rows);
  });
});