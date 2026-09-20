import { z } from 'zod';

export const CatalogProjectionSchema = z.object({
  responseProfile: z.enum(['MINIMAL', 'COMPACT', 'STANDARD', 'FULL']).optional(),
  select: z.array(z.string().max(160).regex(/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/))
    .min(1).max(64).optional(),
});
export type CatalogProjection = z.infer<typeof CatalogProjectionSchema>;
