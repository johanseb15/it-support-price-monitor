export const SupportLevel = {
  LEVEL_1: "LEVEL_1",
  LEVEL_2: "LEVEL_2",
  LEVEL_3: "LEVEL_3",
  UNKNOWN: "UNKNOWN",
} as const;

export type SupportLevel = (typeof SupportLevel)[keyof typeof SupportLevel];
