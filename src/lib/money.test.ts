import { describe, expect, it } from "vitest";

import { formatKobo, formatQuantity, parseAmountToKobo, parseQuantity } from "./money";

describe("parseAmountToKobo", () => {
  it("accepts grouped and decimal amounts", () => {
    expect(parseAmountToKobo("92,500")).toBe(9250000);
    expect(parseAmountToKobo("92500.50")).toBe(9250050);
    expect(parseAmountToKobo("₦1,200")).toBe(120000);
    expect(parseAmountToKobo("0")).toBe(0);
  });

  it("rejects invalid amounts", () => {
    expect(parseAmountToKobo("")).toBeNull();
    expect(parseAmountToKobo("abc")).toBeNull();
    expect(parseAmountToKobo("-5")).toBeNull();
    expect(parseAmountToKobo("1.234")).toBeNull();
  });
});

describe("parseQuantity", () => {
  it("accepts whole and fractional quantities", () => {
    expect(parseQuantity("2")).toBe(2);
    expect(parseQuantity("1.5")).toBe(1.5);
    expect(parseQuantity("1,000")).toBe(1000);
  });

  it("rejects invalid quantities", () => {
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity("two")).toBeNull();
    expect(parseQuantity("-1")).toBeNull();
  });
});

describe("formatKobo", () => {
  it("formats kobo as naira with grouping", () => {
    expect(formatKobo(9250000)).toBe("₦92,500.00");
    expect(formatKobo(0)).toBe("₦0.00");
    expect(formatKobo(350050)).toBe("₦3,500.50");
    expect(formatKobo(-150)).toBe("-₦1.50");
  });
});

describe("formatQuantity", () => {
  it("drops trailing zeros", () => {
    expect(formatQuantity(2)).toBe("2");
    expect(formatQuantity(1.5)).toBe("1.5");
    expect(formatQuantity(1.25)).toBe("1.25");
  });
});
