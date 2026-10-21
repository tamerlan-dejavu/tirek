import { describe, expect, it } from "vitest";

import { orUnknown, RISK } from "./status";

describe("orUnknown", () => {
  it("never invents a value", () => {
    expect(orUnknown(null)).toBe("неизвестно");
    expect(orUnknown("")).toBe("неизвестно");
    expect(orUnknown(0)).toBe("0");
  });
});

describe("RISK", () => {
  it("has a text label for every category, not only color", () => {
    for (const r of Object.values(RISK)) expect(r.label).toMatch(/^R[1-4] · /);
  });
});
