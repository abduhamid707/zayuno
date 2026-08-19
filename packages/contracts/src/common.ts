import { z } from 'zod';

export const CurrencySchema = z.enum(['UZS', 'USD', 'EUR']).default('UZS');
export type Currency = z.infer<typeof CurrencySchema>;

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const AddressSchema = z.object({
  raw: z.string().min(1).describe('Human-readable address or destination description'),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  coordinates: CoordinatesSchema.optional()
});
export type Address = z.infer<typeof AddressSchema>;

export const CustomerContactSchema = z.object({
  name: z.string().min(1).describe('Customer full name'),
  phone: z.string().min(6).describe('Customer phone number e.g. +998901234567'),
  email: z.string().email().optional(),
  externalId: z.string().optional()
});
export type CustomerContact = z.infer<typeof CustomerContactSchema>;

export const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: CurrencySchema
});
export type Money = z.infer<typeof MoneySchema>;

export const PaginationInputSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});
export type PaginationInput = z.infer<typeof PaginationInputSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative()
  });
