export type InteractionKind =
  | "provider"
  | "category"
  | "offering"
  | "variant"
  | "option"
  | "service"
  | "generic";

export type InteractionChoice = {
  id: string;
  kind: InteractionKind;
  title: string;
  subtitle?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  emoji?: string;
  providerSlug?: string;
  offeringId?: string;
  prompt: string;
  groupId: string;
  multiSelect?: boolean;
};

export type InteractionGroup = {
  id: string;
  title: string;
  subtitle?: string;
  selectionMode: "single" | "multiple";
  choices: InteractionChoice[];
};

export type ChatInteraction = {
  version: 1;
  kind: "choice_cards";
  title?: string;
  subtitle?: string;
  groups: InteractionGroup[];
};

export function formatMoney(value?: number, currency = "UZS") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const amount = Math.round(value).toLocaleString("uz-UZ");
  const normalized = currency.toUpperCase();
  if (normalized === "UZS") return `${amount} so‘m`;
  return `${amount} ${normalized}`;
}

export function choiceLabel(choice: InteractionChoice) {
  const price = formatMoney(choice.price, choice.currency);
  return price ? `${choice.title} — ${price}` : choice.title;
}
