import { parseBody } from "@shared/middleware/validation.middleware";
import { getReportsOverview } from "./dashboard.service";
import { reportsOverviewQuerySchema } from "./dashboard.validation";

export const dashboardController = {
  overview: async (query: unknown) => {
    const input = parseBody(reportsOverviewQuerySchema, query);
    return {
      success: true as const,
      data: await getReportsOverview(input),
    };
  },
};
