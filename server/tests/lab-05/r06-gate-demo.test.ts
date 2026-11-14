import { describe, it, expect } from "vitest";

// R-06 / C-02 demonstration ONLY. This test fails on purpose so the required
// check `test-and-docker` fails and the ruleset on main blocks the merge.
// This branch must never be merged.
describe("Lab 5 R-06 merge gate demo", () => {
  it("fails on purpose to show that a failing check blocks the merge", () => {
    expect(1 + 1).toBe(3);
  });
});
