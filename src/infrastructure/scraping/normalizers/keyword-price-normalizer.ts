import { parseArgentineMoney } from "../../../../lib/money";
import type { NormalizedService } from "../../../domain/entities/normalized-service";
import type { IPriceNormalizer } from "../../../domain/ports/price-normalizer";
import type { SupportLevel } from "../../../domain/value-objects/support-level";

type LevelScore = {
  level: Exclude<SupportLevel, "UNKNOWN">;
  score: number;
};

const KEYWORDS: Record<Exclude<SupportLevel, "UNKNOWN">, Array<[RegExp, number]>> = {
  LEVEL_1: [
    [/\bformateo\b/i, 3],
    [/\blimpieza\b/i, 2],
    [/\binstalaci[oó]n\s+(?:de\s+)?windows\b/i, 3],
    [/\binstalaci[oó]n\s+(?:de\s+)?office\b/i, 3],
    [/\bbackup\s+simple\b/i, 2],
    [/\bmantenimiento\s+(?:de\s+)?pc\b/i, 3],
    [/\bantivirus\b/i, 2],
  ],
  LEVEL_2: [
    [/\bred(?:es)?\b/i, 3],
    [/\brouters?\b/i, 2],
    [/\bservidores?\s+b[aá]sicos?\b/i, 3],
    [/\bimpresoras?\s+de\s+red\b/i, 2],
    [/\boutlook\s+corporativo\b/i, 3],
    [/\bdominios?\b/i, 2],
    [/\bactive\s+directory\s+b[aá]sico\b/i, 3],
    [/\bsoporte\s+(?:para\s+)?empresas\b/i, 2],
  ],
  LEVEL_3: [
    [/\brecuperaci[oó]n\s+de\s+datos\b/i, 4],
    [/\braid\b/i, 4],
    [/\bssd\b/i, 2],
    [/\bciberseguridad\b/i, 4],
    [/\bfirewall\s+avanzado\b/i, 4],
    [/\bservidores?\s+cr[ií]ticos?\b/i, 4],
    [/\bvirtualizaci[oó]n\b/i, 3],
    [/\bincident\s+response\b/i, 4],
  ],
};

function scoreText(text: string): LevelScore[] {
  return Object.entries(KEYWORDS).map(([level, patterns]) => ({
    level: level as Exclude<SupportLevel, "UNKNOWN">,
    score: patterns.reduce((total, [pattern, weight]) => {
      return pattern.test(text) ? total + weight : total;
    }, 0),
  }));
}

function chooseSupportLevel(text: string): {
  supportLevel: SupportLevel;
  confidence: number;
} {
  const scores = scoreText(text).sort((a, b) => b.score - a.score);
  const [best, second] = scores;

  if (!best || best.score === 0) {
    return { supportLevel: "UNKNOWN", confidence: 0.4 };
  }

  const margin = best.score - (second?.score ?? 0);
  const confidence = Math.min(0.95, 0.55 + best.score * 0.08 + margin * 0.05);

  return {
    supportLevel: best.level,
    confidence: Number(confidence.toFixed(2)),
  };
}

function buildServiceName(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function normalizeData(text: string, priceRaw: string): Promise<NormalizedService> {
  return new KeywordPriceNormalizer().normalize(text, priceRaw);
}

export class KeywordPriceNormalizer implements IPriceNormalizer {
  async normalize(text: string, priceRaw: string): Promise<NormalizedService> {
    const safeText = typeof text === "string" ? text : "";
    const safePriceRaw = typeof priceRaw === "string" ? priceRaw : "";

    const price = parseArgentineMoney(safePriceRaw);
    const combinedText = `${safeText} ${safePriceRaw}`.trim();
    const { supportLevel, confidence } = chooseSupportLevel(combinedText);

    return {
      isValid: price !== null,
      supportLevel,
      serviceName: buildServiceName(safeText),
      price,
      confidence: price === null ? 0 : confidence,
    };
  }
}
