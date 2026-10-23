import { describe, expect, it } from "vitest";

import { DEFECT_STATUS, orUnknown, relativeDue, RISK } from "./status";

describe("orUnknown", () => {
  it("never invents a value", () => {
    expect(orUnknown(null)).toBe("неизвестно");
    expect(orUnknown("")).toBe("неизвестно");
    expect(orUnknown(0)).toBe("0");
    expect(orUnknown(9, "эт.")).toBe("9 эт.");
  });
});

describe("semantic vocabulary", () => {
  it("every risk category has a text label, not only color", () => {
    for (const r of Object.values(RISK)) expect(r.label).toMatch(/^R[1-4] · /);
  });
  it("every defect status has a label and tone", () => {
    for (const s of Object.values(DEFECT_STATUS)) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.tone).toBeTruthy();
    }
  });
});

describe("relativeDue", () => {
  it("describes missing deadlines explicitly", () => {
    expect(relativeDue(null)).toBe("срок не назначен");
  });
});
