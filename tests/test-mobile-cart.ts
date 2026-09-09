import assert from "node:assert/strict";
import { addOffering, composerHint, MAX_CART_QUANTITY, offeringKey, summarizeTray, trayOrderText, updateTrayQuantity } from "../apps/mobile/src/lib/cart";
import type { CatalogOfferingItem, TrayItem } from "../apps/mobile/src/lib/interaction";

const pizza: CatalogOfferingItem = {
  id: "a", offeringId: "pizza", providerSlug: "provider-a", title: "Pitsa, 30 sm",
  categorySlug: "pizza", price: 88000, currency: "UZS",
};
let items: TrayItem[] = [];
for (let i = 0; i < 3; i++) items = addOffering(items, pizza);
assert.equal(items.length, 1);
assert.equal(summarizeTray(items).quantity, 3);
assert.match(trayOrderText(items), /Pitsa, 30 sm \(3 ta\)/);
const otherProvider = { ...pizza, providerSlug: "provider-b" };
items = addOffering(items, otherProvider);
assert.equal(items.length, 2, "provider-local product IDs must not merge across restaurants");
assert.notEqual(offeringKey(pizza), offeringKey(otherProvider));
const totals = summarizeTray(items);
assert.equal(totals.quantity, 4);
assert.equal(totals.totalLabel.replace(/[^0-9]/g, ""), "352000");
items = updateTrayQuantity(items, items[0].id, 2);
assert.equal(summarizeTray(items).quantity, 3);
items = updateTrayQuantity(items, items[0].id, 0);
assert.equal(items.length, 1);
for (let i = 0; i < 30; i++) items = addOffering(items, otherProvider);
assert.equal(summarizeTray(items).quantity, MAX_CART_QUANTITY);
items = addOffering(items, { ...pizza, offeringId: "usd", price: 5, currency: "USD" });
assert.match(summarizeTray(items).totalLabel, /so‘m \+ 5 USD/, "different currencies must never be added together");
const extras: TrayItem[] = [{ type: "note", id: "note", text: "Soussiz" }, { type: "attachment", id: "img", uri: "https://example.com/photo.png" }];
assert.deepEqual(addOffering(extras, pizza).slice(0, 2), extras);
assert.equal(composerHint({ version: 1, kind: "catalog_menu" }), "Yoki yozing: Coca-Cola x3");
assert.equal(composerHint({ version: 1, kind: "choice_cards" }), "Xabar yozing…");
assert.match(composerHint(undefined, true), /Izoh/);
console.log("Mobile cart: quantities, provider identity, currency totals, context hints and order text passed.");
