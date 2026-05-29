import { describe, expect, it } from "vitest";

import { normalizeData } from "../../src/services/scraper/normalizer";

describe("normalizeData", () => {
  it("classifies LEVEL_1 services", async () => {
    const result = await normalizeData(
      "Formateo e instalacion Windows con Office y limpieza de PC",
      "$ 15.000",
    );

    expect(result).toMatchObject({
      isValid: true,
      supportLevel: "LEVEL_1",
      price: 15000,
    });
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("classifies LEVEL_2 services", async () => {
    const result = await normalizeData(
      "Configuracion de redes, routers y Outlook corporativo para empresas",
      "ARS 45000",
    );

    expect(result).toMatchObject({
      isValid: true,
      supportLevel: "LEVEL_2",
      price: 45000,
    });
  });

  it("classifies LEVEL_3 services", async () => {
    const result = await normalizeData(
      "Recuperacion de datos SSD RAID y ciberseguridad para servidores criticos",
      "desde $ 120.000",
    );

    expect(result).toMatchObject({
      isValid: true,
      supportLevel: "LEVEL_3",
      price: 120000,
    });
  });

  it("keeps valid ambiguous prices as UNKNOWN", async () => {
    const result = await normalizeData("Servicio tecnico remoto", "15.000 pesos");

    expect(result).toMatchObject({
      isValid: true,
      supportLevel: "UNKNOWN",
      price: 15000,
    });
  });

  it("marks services without price as invalid", async () => {
    const result = await normalizeData("Mantenimiento PC", "consultar");

    expect(result).toMatchObject({
      isValid: false,
      supportLevel: "LEVEL_1",
      price: null,
      confidence: 0,
    });
  });
});
