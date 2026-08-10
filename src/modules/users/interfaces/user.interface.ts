import type { UserDocument } from "../user.model";
import type { AuthUser } from "@shared/types";

/** Map DB user → public AuthUser. Never exposes password material. */
export function toSafeUser(user: UserDocument): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    isActive: user.isActive,
    deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
    password: null,
    createdBy: user.createdBy ? user.createdBy.toString() : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type { AuthUser };
