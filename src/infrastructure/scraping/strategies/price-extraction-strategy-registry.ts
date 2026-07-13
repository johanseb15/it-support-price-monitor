import type { IPriceExtractionStrategy } from "../../../domain/ports/price-extraction-strategy";
import { DefaultPriceExtractionStrategy } from "./default-price-extraction-strategy";

export class PriceExtractionStrategyRegistry {
  constructor(private readonly strategies: IPriceExtractionStrategy[]) {}

  resolve(url: string): IPriceExtractionStrategy {
    const specific = this.strategies.find(
      (strategy) => strategy.name !== "default" && strategy.canHandle(url),
    );

    return specific ?? this.strategies.find((strategy) => strategy.name === "default")!;
  }

  static createDefault(): PriceExtractionStrategyRegistry {
    return new PriceExtractionStrategyRegistry([new DefaultPriceExtractionStrategy()]);
  }
}
