import { z } from "zod";

export const reportsOverviewQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
});

export type ReportsOverviewQuery = z.infer<typeof reportsOverviewQuerySchema>;
