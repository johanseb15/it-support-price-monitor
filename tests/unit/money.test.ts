import { describe, expect, it } from "vitest";

import { parseArgentineMoney } from "../../lib/money";

describe("parseArgentineMoney", () => {
  it.each([
    ["$ 15.000", 15000],
    ["$15,000", 15000],
    ["ARS 15000", 15000],
    ["15.000 pesos", 15000],
    ["desde $ 25.500", 25500],
    ["1.200,50", 1200.5],
    ["a partir de $ 35.000 por visita", 35000],
  ])("parses %s as %s ARS", (input, expected) => {
    expect(parseArgentineMoney(input)).toBe(expected);
  });

  it("returns null when there is no reliable price context", () => {
    expect(parseArgentineMoney("servicio tecnico sin precio publicado")).toBeNull();
  });
});
