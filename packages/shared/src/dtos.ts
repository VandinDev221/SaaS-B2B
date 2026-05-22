import { z } from "zod";

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50)
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const LeadListQuerySchema = PaginationSchema.extend({
  stage: z.string().optional(),
  q: z.string().optional()
});
export type LeadListQuery = z.infer<typeof LeadListQuerySchema>;

export const CreateLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.string().optional()
});
export type CreateLeadDto = z.infer<typeof CreateLeadSchema>;

