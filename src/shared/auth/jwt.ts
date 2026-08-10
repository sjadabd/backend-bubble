import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { env } from "@config/env";

/** Admin / super_admin session length */
export const JWT_ACCESS_EXP = "12h";
export const JWT_REFRESH_EXP = "7d";

/** @deprecated use JWT_ACCESS_EXP */
export const JWT_EXP = JWT_ACCESS_EXP;

export const jwtPlugin = new Elysia({ name: "jwt-access-plugin" }).use(
  jwt({
    name: "jwt",
    secret: env.jwtAccessSecret,
    exp: JWT_ACCESS_EXP,
  }),
);

export const refreshJwtPlugin = new Elysia({ name: "jwt-refresh-plugin" }).use(
  jwt({
    name: "refreshJwt",
    secret: env.jwtRefreshSecret,
    exp: JWT_REFRESH_EXP,
  }),
);
