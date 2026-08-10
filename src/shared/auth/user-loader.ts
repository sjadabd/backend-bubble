import type { AuthUser } from "@shared/types";

export type UserLoader = (id: string) => Promise<AuthUser>;

let userLoader: UserLoader | null = null;

/** Register once at app boot — keeps shared free of feature-module imports. */
export function registerUserLoader(loader: UserLoader) {
  userLoader = loader;
}

export function getUserLoader(): UserLoader {
  if (!userLoader) {
    throw new Error(
      "[auth] UserLoader not registered. Call registerUserLoader() during app bootstrap.",
    );
  }
  return userLoader;
}
