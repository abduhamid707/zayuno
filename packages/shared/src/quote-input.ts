/** Canonical quote inputs retained for action binding. Provider-derived quote parameters are not input authority. */
export function canonicalQuoteInput(input: any) {
  return {
    items: (input.items || []).map((item: any) => ({ offeringId: item.offeringId, variantId: item.variantId || null,
      quantity: item.quantity || 1, selectedOptions: item.selectedOptions || [] })),
    locationId: input.locationId || null,
    locations: input.locations || [],
    destination: input.destination || null,
    fulfillmentType: input.fulfillmentType || 'STANDARD',
    parameters: input.parameters || {},
    paymentMethod: input.paymentMethod || null,
    promoCode: input.promoCode || null,
  };
}
