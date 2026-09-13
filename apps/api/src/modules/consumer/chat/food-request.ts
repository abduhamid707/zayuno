// A single model owns interpretation and response generation. No alias or
// emergency model substitution: outages are reported as retryable failures.
export const CONSUMER_GEMINI_MODEL = "gemini-3.5-flash-lite";

export type FoodConstraints = {
  maxBudget?: number;
  budgetScope: "total" | "food" | "unspecified";
  people?: number;
  requestedTime?: string;
};

export function readFoodBudget(text: string): number | undefined {
  const input = String(text || "").toLowerCase();
  const thousands = input.match(/(?:^|[^\d])(\d+(?:[.,]\d+)?)\s*(?:ming(?:lik|gacha|ga|ka|dan|a)?|тыс(?:яч(?:и|у)?)?\.?|thousand|k)(?=$|[^\p{L}\p{N}])/u);
  if (thousands) return Math.round(Number(thousands[1].replace(",", ".")) * 1000);
  // A phone number is not a budget. Plain amounts need a money/budget marker.
  const amount = input.match(/(?:^|[^\d])(\d{1,3}(?:[\s\u00a0,.]\d{3})+|\d{2,8})\s*(?:so[‘'’`ʻ]?m|som|uzs|сум|sum|gacha|dan\s+oshmasin)(?=$|[^\p{L}])/u);
  return amount ? Number(amount[1].replace(/[\s\u00a0,.]/g, "")) : undefined;
}

export function normalizeFoodConstraints(value: any, query: string): FoodConstraints {
  const amount = Number(value?.maxBudget);
  const people = Number(value?.people);
  return {
    maxBudget: readFoodBudget(query) ?? (Number.isFinite(amount) && amount > 0 ? amount : undefined),
    budgetScope: value?.budgetScope === "food" ? "food" : value?.budgetScope === "total" ? "total" : "unspecified",
    people: Number.isInteger(people) && people > 0 ? people : undefined,
    requestedTime: typeof value?.requestedTime === "string" && value.requestedTime.trim() ? value.requestedTime.trim().slice(0, 160) : undefined,
  };
}

export function lowestAvailableFoodPrice(item: any): number | undefined {
  const variants = Array.isArray(item?.variants) ? item.variants : [];
  const prices = variants.length
    ? variants.filter((v: any) => v.isAvailable !== false).map((v: any) => v.basePrice ?? v.price ?? item.basePrice)
    : [item?.basePrice ?? item?.price];
  const valid = prices.filter((p: any) => p !== null && p !== undefined && p !== "")
    .map(Number).filter((p: number) => Number.isFinite(p) && p >= 0);
  return valid.length ? Math.min(...valid) : undefined;
}
