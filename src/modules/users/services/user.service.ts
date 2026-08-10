import { messages } from "@constants/messages";
import { statusCodes } from "@constants/statusCodes";
import { AppError } from "@shared/errors";
import { hashPassword } from "@shared/auth";
import { UserRepository } from "../repositories";
import { toSafeUser } from "../interfaces";
import type { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from "../dto";

export async function getUserById(id: string) {
  const user = await UserRepository.findById(id);
  if (!user || user.deletedAt) {
    throw new AppError(messages.userNotFound, statusCodes.NOT_FOUND);
  }
  return toSafeUser(user);
}

export async function listUsers(query: ListUsersQueryDto) {
  const filter: Record<string, unknown> = {
    role: { $ne: "super_admin" },
  };

  if (query.status === "active") {
    filter.isActive = true;
    filter.deletedAt = null;
  } else if (query.status === "inactive") {
    filter.isActive = false;
    filter.deletedAt = null;
  } else {
    filter.deletedAt = { $ne: null };
  }

  if (query.search) {
    const regex = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const sort: Record<string, 1 | -1> = {
    [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
  };

  const skip = (query.page - 1) * query.limit;

  const [users, total] = await Promise.all([
    UserRepository.findMany(filter, {
      sort,
      skip,
      limit: query.limit,
    }),
    UserRepository.count(filter),
  ]);

  return {
    items: users.map((user) => toSafeUser(user)),
    page: query.page,
    limit: query.limit,
    total,
    search: query.search ?? "",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
  };
}

export async function createAdminUser(input: CreateUserDto, createdBy: string) {
  const existing = await UserRepository.findByEmail(input.email);
  if (existing) {
    throw new AppError(messages.emailInUse, statusCodes.CONFLICT);
  }

  const password = await hashPassword(input.password);

  const user = await UserRepository.create({
    name: input.name,
    email: input.email,
    password,
    passwordEncrypted: null,
    role: "admin",
    permissions: input.permissions,
    isActive: input.isActive ?? true,
    deletedAt: null,
    createdBy,
  });

  return toSafeUser(user);
}

export async function updateAdminUser(id: string, input: UpdateUserDto) {
  const user = await UserRepository.findById(id);
  if (!user) {
    throw new AppError(messages.userNotFound, statusCodes.NOT_FOUND);
  }

  if (user.role === "super_admin") {
    throw new AppError(messages.cannotModifySuperAdmin, statusCodes.FORBIDDEN);
  }

  if (input.email && input.email !== user.email) {
    const existing = await UserRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(messages.emailInUse, statusCodes.CONFLICT);
    }
    user.email = input.email;
  }

  if (input.name !== undefined) user.name = input.name;
  if (input.permissions !== undefined) user.permissions = input.permissions;
  if (input.isActive !== undefined) user.isActive = input.isActive;

  if (input.password) {
    user.password = await hashPassword(input.password);
    user.passwordEncrypted = null;
  }

  await UserRepository.save(user);
  return toSafeUser(user);
}

export async function deleteAdminUser(id: string, currentUserId: string) {
  if (id === currentUserId) {
    throw new AppError(messages.cannotDeleteSelf, statusCodes.BAD_REQUEST);
  }

  const user = await UserRepository.findById(id);
  if (!user) {
    throw new AppError(messages.userNotFound, statusCodes.NOT_FOUND);
  }

  if (user.role === "super_admin") {
    throw new AppError(messages.cannotDeleteSuperAdmin, statusCodes.FORBIDDEN);
  }

  user.deletedAt = new Date();
  user.isActive = false;
  await UserRepository.save(user);
  return { id };
}

export async function restoreAdminUser(id: string) {
  const user = await UserRepository.findById(id);
  if (!user) {
    throw new AppError(messages.userNotFound, statusCodes.NOT_FOUND);
  }

  if (user.role === "super_admin") {
    throw new AppError(messages.cannotRestoreSuperAdmin, statusCodes.FORBIDDEN);
  }

  if (!user.deletedAt) {
    throw new AppError(messages.userNotDeleted, statusCodes.BAD_REQUEST);
  }

  user.deletedAt = null;
  user.isActive = true;
  await UserRepository.save(user);
  return toSafeUser(user);
}
