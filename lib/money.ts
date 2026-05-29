const MONEY_CONTEXT_PATTERN =
  /(?:ars|a\s*partir\s*de|desde|pesos?|\$)\s*([0-9][0-9\s.,]*)|([0-9][0-9\s.,]*)\s*(?:ars|pesos?)/i;
const STANDALONE_FORMATTED_MONEY_PATTERN =
  /\b([0-9]{1,3}(?:[.,][0-9]{3})+(?:,[0-9]{1,2})?|[0-9]+,[0-9]{1,2})\b/;

function normalizeSeparators(value: string): number | null {
  const compact = value.replace(/\s+/g, "");

  if (!compact || !/\d/.test(compact)) {
    return null;
  }

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparator =
    lastComma > -1 && lastDot > -1
      ? lastComma > lastDot
        ? ","
        : "."
      : lastComma > -1
        ? ","
        : lastDot > -1
          ? "."
          : null;

  if (!decimalSeparator) {
    return Number(compact);
  }

  const separatorCount = compact.split(decimalSeparator).length - 1;
  const [integerPart, decimalPart = ""] = compact.split(decimalSeparator);

  const hasDecimalCents =
    separatorCount === 1 && decimalPart.length > 0 && decimalPart.length <= 2;

  if (hasDecimalCents) {
    const normalizedInteger = integerPart.replace(/[.,]/g, "");
    return Number(`${normalizedInteger}.${decimalPart}`);
  }

  return Number(compact.replace(/[.,]/g, ""));
}

export function parseArgentineMoney(input: string): number | null {
  const match = input.match(MONEY_CONTEXT_PATTERN);
  const formattedMatch = input.match(STANDALONE_FORMATTED_MONEY_PATTERN);
  const rawAmount = match?.[1] ?? match?.[2] ?? formattedMatch?.[1];

  if (!rawAmount) {
    return null;
  }

  const amount = normalizeSeparators(rawAmount);

  if (amount === null || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}
