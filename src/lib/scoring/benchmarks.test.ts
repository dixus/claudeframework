import { describe, it, expect } from "vitest";
import { getBenchmark, getNextLevelThreshold } from "./benchmarks";

describe("getBenchmark", () => {
  it("returns correct data for Level 0", () => {
    const b = getBenchmark(0);
    expect(b.arrPerEmployee).toBe("€150–200K");
    expect(b.monthsTo100M).toBe("60+");
    expect(b.peerPercent).toBe(24);
    expect(b.levelMeanTheta).toBe(10);
  });

  it("returns correct data for Level 1", () => {
    const b = getBenchmark(1);
    expect(b.arrPerEmployee).toBe("€200–600K");
    expect(b.monthsTo100M).toBe("36–60");
    expect(b.peerPercent).toBe(37);
    expect(b.levelMeanTheta).toBe(35);
  });

  it("returns correct data for Level 2", () => {
    const b = getBenchmark(2);
    expect(b.arrPerEmployee).toBe("€400K–2M");
    expect(b.monthsTo100M).toBe("24–36");
    expect(b.peerPercent).toBe(24);
    expect(b.levelMeanTheta).toBe(65);
  });

  it("returns correct data for Level 3", () => {
    const b = getBenchmark(3);
    expect(b.arrPerEmployee).toBe("€700K–6M");
    expect(b.monthsTo100M).toBe("18–24");
    expect(b.peerPercent).toBe(15);
    expect(b.levelMeanTheta).toBe(90);
  });
});

describe("getNextLevelThreshold", () => {
  it("L0 → threshold 21", () => expect(getNextLevelThreshold(0)).toBe(21));
  it("L1 → threshold 51", () => expect(getNextLevelThreshold(1)).toBe(51));
  it("L2 → threshold 81", () => expect(getNextLevelThreshold(2)).toBe(81));
  it("L3 → null (no next level)", () =>
    expect(getNextLevelThreshold(3)).toBeNull());
});
