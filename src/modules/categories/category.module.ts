import { categoryRoutes } from "./routes";
import { CategoryRepository } from "./repositories";
import * as categoryServices from "./services";

export const CategoryModule = {
  name: "categories",
  routes: categoryRoutes,
  repositories: { CategoryRepository },
  services: categoryServices,
} as const;
