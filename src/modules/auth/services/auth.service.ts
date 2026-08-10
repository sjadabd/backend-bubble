import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { hashPassword, comparePassword } from "@shared/auth";
import { UserRepository, toSafeUser } from "@modules/users";
import type { BootstrapDto, LoginDto } from "../dto";

export async function hasSuperAdmin() {
  const count = await UserRepository.countByRole("super_admin");
  return count > 0;
}

export async function bootstrapSuperAdmin(input: BootstrapDto) {
  if (await hasSuperAdmin()) {
    throw new AppError(messages.superAdminExists, statusCodes.CONFLICT);
  }

  const existingEmail = await UserRepository.findByEmail(input.email);
  if (existingEmail) {
    throw new AppError(messages.emailInUse, statusCodes.CONFLICT);
  }

  const password = await hashPassword(input.password);

  const user = await UserRepository.create({
    name: input.name,
    email: input.email,
    password,
    role: "super_admin",
    permissions: [],
    isActive: true,
  });

  return toSafeUser(user);
}

export async function loginUser(input: LoginDto) {
  const user = await UserRepository.findByEmailWithPassword(input.email);

  if (!user || !user.password) {
    throw new AppError(messages.invalidCredentials, statusCodes.UNAUTHORIZED);
  }

  if (!user.isActive || user.deletedAt) {
    throw new AppError(messages.accountDisabled, statusCodes.FORBIDDEN);
  }

  const valid = await comparePassword(input.password, user.password);
  if (!valid) {
    throw new AppError(messages.invalidCredentials, statusCodes.UNAUTHORIZED);
  }

  return toSafeUser(user);
}
