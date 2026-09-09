import type {
  CatalogOfferingItem,
  ChatInteraction,
  TrayItem,
} from "./interaction";
import { formatMoney } from "./interaction";

export const MAX_CART_QUANTITY = 20;
export const offeringKey = (item: {
  providerSlug: string;
  offeringId: string;
}) => `${item.providerSlug}:${item.offeringId}`;

export function addOffering(
  items: TrayItem[],
  offering: CatalogOfferingItem,
): TrayItem[] {
  const key = offeringKey(offering);
  const existing = items.find(
    (item) => item.type === "offering" && offeringKey(item) === key,
  );
  if (existing?.type === "offering") {
    return items.map((item) =>
      item === existing
        ? {
            ...existing,
            quantity: Math.min(existing.quantity + 1, MAX_CART_QUANTITY),
          }
        : item,
    );
  }
  return [
    ...items,
    {
      type: "offering",
      id: `tray:${key}`,
      offeringId: offering.offeringId,
      providerSlug: offering.providerSlug,
      title: offering.title,
      price: offering.price,
      currency: offering.currency,
      imageUrl: offering.imageUrl,
      quantity: 1,
    },
  ];
}

export function updateTrayQuantity(
  items: TrayItem[],
  id: string,
  quantity: number,
): TrayItem[] {
  if (quantity <= 0) return items.filter((item) => item.id !== id);
  return items.map((item) =>
    item.id === id && item.type === "offering"
      ? { ...item, quantity: Math.min(Math.floor(quantity), MAX_CART_QUANTITY) }
      : item,
  );
}

export function summarizeTray(items: TrayItem[]) {
  const totals = new Map<string, number>();
  let quantity = 0;
  for (const item of items) {
    if (item.type !== "offering") continue;
    quantity += item.quantity;
    const currency = (item.currency || "UZS").toUpperCase();
    totals.set(
      currency,
      (totals.get(currency) || 0) + item.price * item.quantity,
    );
  }
  return {
    quantity,
    totalLabel: [...totals]
      .map(([currency, total]) => formatMoney(total, currency))
      .join(" + "),
  };
}

export function trayOrderText(items: TrayItem[]): string {
  return items
    .filter(
      (item): item is Extract<TrayItem, { type: "offering" }> =>
        item.type === "offering",
    )
    .map((item) => `${item.title} (${item.quantity} ta)`)
    .join(", ");
}

export function composerHint(
  interaction?: ChatInteraction | null,
  hasTray = false,
): string {
  if (hasTray) return "Izoh yoki yana mahsulot yozing…";
  if (interaction?.kind !== "catalog_menu") return "Xabar yozing…";
  return "Yoki yozing: Coca-Cola x3";
}
