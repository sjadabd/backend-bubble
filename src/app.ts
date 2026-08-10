import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { env } from "@config/env";
import { APP_NAME, APP_VERSION } from "@constants";
import { registerUserLoader } from "@shared/auth";
import { requestContextPlugin } from "@shared/middleware/request-context.middleware";
import { getUserById } from "@modules/users";
import { routes } from "./routes";

registerUserLoader(getUserById);

export const app = new Elysia()
  .use(requestContextPlugin)
  .use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: APP_NAME,
          version: APP_VERSION,
          description: "واجهة برمجة تطبيقات متجر Bubble لمنتجات التنظيف",
        },
      },
    }),
  )
  .use(routes);
