import { z } from 'zod';
import { CoordinatesSchema, optionalNullable } from './common';

export const LocationOperatingHoursSchema = z.object({
  open: z.string().describe('Opening time e.g. "09:00"'),
  close: z.string().describe('Closing time e.g. "22:00"'),
  days: z.array(z.number().int().min(1).max(7)).describe('Active days of week [1=Mon..7=Sun]')
});
export type LocationOperatingHours = z.infer<typeof LocationOperatingHoursSchema>;

export const LocationSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  providerLocationId: z.string().describe('External provider identifier for this branch or location'),
  name: z.string().min(1),
  address: z.string().min(1),
  coordinates: optionalNullable(CoordinatesSchema),
  operatingHours: optionalNullable(LocationOperatingHoursSchema),
  serviceRadiusKm: optionalNullable(z.number().nonnegative(), 10.0),
  isActive: z.boolean().default(true),
  metadata: optionalNullable(z.record(z.any()), {})
});
export type Location = z.infer<typeof LocationSchema>;

export const GetLocationsInputSchema = z.object({
  providerSlug: z.string().min(1),
  activeOnly: optionalNullable(z.boolean()),
  coordinates: optionalNullable(CoordinatesSchema)
});
export type GetLocationsInput = z.infer<typeof GetLocationsInputSchema>;
