import type { Document } from "mongoose";
import type { Permission } from "@constants/permissions";
import type { UserRole } from "@constants/roles";
import { User, type UserDocument } from "../user.model";

export type CreateUserData = {
  name: string;
  email: string;
  password: string;
  passwordEncrypted?: string | null;
  role: UserRole;
  permissions: Permission[];
  isActive?: boolean;
  deletedAt?: Date | null;
  createdBy?: string;
};

type UserDoc = UserDocument & Document;

export const UserRepository = {
  async countByRole(role: UserRole) {
    return User.countDocuments({ role });
  },

  async findByEmail(email: string) {
    return User.findOne({ email });
  },

  async findByEmailWithPassword(email: string) {
    return User.findOne({ email }).select("+password");
  },

  async findById(id: string) {
    return User.findById(id);
  },

  async findByIdWithPasswordEncrypted(id: string) {
    return User.findById(id).select("+passwordEncrypted");
  },

  async create(data: CreateUserData) {
    return User.create(data);
  },

  async findMany(
    filter: Record<string, unknown>,
    options: {
      sort: Record<string, 1 | -1>;
      skip: number;
      limit: number;
    },
  ) {
    return User.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit);
  },

  async count(filter: Record<string, unknown>) {
    return User.countDocuments(filter);
  },

  async save(user: UserDoc) {
    return user.save();
  },
};
