import { describe, it, expect } from "vitest";

describe("Awareness visual stage calculation", () => {
  function computeVisualStage(practiceCount: number, isAnchored: boolean = false): 1 | 2 | 3 | 4 {
    if (practiceCount >= 14 || isAnchored) return 4;
    if (practiceCount >= 7) return 3;
    if (practiceCount >= 3) return 2;
    return 1;
  }

  it("calculates Stage 1 (芽生え / 薄い泡) for 0 to 2 practices", () => {
    expect(computeVisualStage(0)).toBe(1);
    expect(computeVisualStage(1)).toBe(1);
    expect(computeVisualStage(2)).toBe(1);
  });

  it("calculates Stage 2 (成長中 / 光の核) for 3 to 6 practices", () => {
    expect(computeVisualStage(3)).toBe(2);
    expect(computeVisualStage(5)).toBe(2);
    expect(computeVisualStage(6)).toBe(2);
  });

  it("calculates Stage 3 (クリスタル / オーラ水晶) for 7 to 13 practices", () => {
    expect(computeVisualStage(7)).toBe(3);
    expect(computeVisualStage(10)).toBe(3);
    expect(computeVisualStage(13)).toBe(3);
  });

  it("calculates Stage 4 (定着の星 / 黄金のオーブ) for 14+ practices or anchored status", () => {
    expect(computeVisualStage(14)).toBe(4);
    expect(computeVisualStage(21)).toBe(4);
    expect(computeVisualStage(2, true)).toBe(4);
  });
});
