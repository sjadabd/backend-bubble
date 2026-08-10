import { userRoutes } from "./routes";
import { UserRepository } from "./repositories";
import * as userServices from "./services";

export const UserModule = {
  name: "users",
  routes: userRoutes,
  repositories: { UserRepository },
  services: userServices,
} as const;
