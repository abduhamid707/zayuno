import { z } from 'zod';
import { IsoDateTimeSchema } from './common';

/**
 * Cross-domain context for inventory that depends on time, party size, route,
 * or user preferences. Providers may add fields in `preferences` without a
 * Zayuno core release. This works for transport, lodging, appointments, event
 * tickets, rentals, and other bookable services.
 */
export const ServicePartySchema = z.object({
  adults: z.number().int().nonnegative().default(1),
  children: z.number().int().nonnegative().default(0),
  infants: z.number().int().nonnegative().default(0)
}).refine(value => value.adults + value.children + value.infants > 0, {
  message: 'At least one party member is required.'
});
export type ServiceParty = z.infer<typeof ServicePartySchema>;

export const DynamicServiceContextSchema = z.object({
  origin: z.string().min(1).max(160).optional(),
  destination: z.string().min(1).max(160).optional(),
  startAt: IsoDateTimeSchema.optional(),
  endAt: IsoDateTimeSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  party: ServicePartySchema.optional(),
  locale: z.string().min(2).max(20).optional(),
  timezone: z.string().min(1).max(80).optional(),
  preferences: z.record(z.any()).optional().default({})
});
export type DynamicServiceContext = z.infer<typeof DynamicServiceContextSchema>;

export const CapacitySelectionSchema = z.object({
  resourceId: z.string().min(1).describe('Seat, room, slot, vehicle, table, or other capacity resource ID'),
  groupId: z.string().optional().describe('Optional car, room type, facility, section, or resource group'),
  attributes: z.record(z.any()).optional().default({})
});
export type CapacitySelection = z.infer<typeof CapacitySelectionSchema>;
