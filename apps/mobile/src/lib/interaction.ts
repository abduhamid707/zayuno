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

export type ProviderCardItem = {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  brandColor?: string;
  badge?: string;
  cuisine?: string;
  prompt: string;
};

export type CategoryRibbonItem = {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string;
  emoji?: string;
  itemCount: number;
};

export type CatalogOfferingItem = {
  id: string;
  offeringId: string;
  providerSlug: string;
  categorySlug: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  variantsCount?: number;
  optionsCount?: number;
};

export type CatalogSectionItem = {
  categorySlug: string;
  categoryTitle: string;
  itemCount: number;
  offerings: CatalogOfferingItem[];
};

export type ChatInteraction = {
  version: 1;
  kind: "choice_cards" | "provider_list" | "catalog_menu";
  title?: string;
  subtitle?: string;
  groups?: InteractionGroup[];
  providers?: ProviderCardItem[];
  providerSlug?: string;
  providerName?: string;
  providerLogoUrl?: string;
  locationName?: string;
  categories?: CategoryRibbonItem[];
  sections?: CatalogSectionItem[];
};

export type TrayItem =
  | {
      type: "offering";
      id: string;
      offeringId: string;
      providerSlug: string;
      title: string;
      price: number;
      currency?: string;
      imageUrl?: string;
      quantity: number;
    }
  | {
      type: "note";
      id: string;
      text: string;
    }
  | {
      type: "attachment";
      id: string;
      uri: string;
      title?: string;
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

