import { parseBody } from "@shared/middleware/validation.middleware";
import { listGoogleCustomers } from "./customer.service";
import { listCustomersQuerySchema } from "./customer.validation";

export const customerController = {
  list: async (query: unknown) => {
    const input = parseBody(listCustomersQuerySchema, query);
    return { success: true, data: await listGoogleCustomers(input) };
  },
};
