import type { SupportLevel } from "../value-objects/support-level";

export type NormalizedService = {
  isValid: boolean;
  supportLevel: SupportLevel;
  serviceName: string;
  price: number | null;
  confidence: number;
};
