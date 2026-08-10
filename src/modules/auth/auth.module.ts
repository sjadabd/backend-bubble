import { authRoutes } from "./routes";
import * as authServices from "./services";

export const AuthModule = {
  name: "auth",
  routes: authRoutes,
  repositories: {},
  services: authServices,
} as const;
