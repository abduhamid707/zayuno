import { z } from 'zod';

export const CurrencySchema = z.enum(['UZS', 'USD', 'EUR']).default('UZS');
export type Currency = z.infer<typeof CurrencySchema>;

/**
 * Normalizes an optional provider response field.
 * If a provider backend (e.g. FastAPI/Pydantic, Go, .NET, Laravel) sends `null` for an optional field,
 * it is normalized to `undefined` (or the schema's default value if provided) during parsing.
 * Non-null, non-undefined values are strictly validated against `innerSchema`.
 */
export function optionalNullable<T extends z.ZodTypeAny>(
  innerSchema: T
): z.ZodEffects<z.ZodOptional<T>, z.infer<T> | undefined, unknown>;
export function optionalNullable<T extends z.ZodTypeAny, D extends z.infer<T>>(
  innerSchema: T,
  defaultValue: D
): z.ZodEffects<z.ZodDefault<T>, z.infer<T>, unknown>;
export function optionalNullable<T extends z.ZodTypeAny, D extends z.infer<T>>(
  innerSchema: T,
  defaultValue?: D
) {
  if (defaultValue !== undefined) {
    return z.preprocess(
      val => (val === null || val === undefined ? defaultValue : val),
      innerSchema.default(defaultValue)
    );
  }
  return z.preprocess(
    val => (val === null ? undefined : val),
    innerSchema.optional()
  );
}

/**
 * Canonical provider timestamp. RFC 3339 offsets are accepted so providers can
 * use the native UTC output of Node.js, Python, Go, Java, and .NET without
 * rewriting a valid `+00:00`/`+05:00` timestamp to the `Z` form first.
 */
export const IsoDateTimeSchema = z.string().datetime({ offset: true });

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
  email: z.string().email().nullish().transform(value => value ?? undefined),
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
