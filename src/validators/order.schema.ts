import { z } from "zod";

export const createOrderSchema = z.object({
  tenantId: z.number().int().positive(),
  customer: z.string().min(1),
  total: z.number().nonnegative(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
