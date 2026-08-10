import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { Permission } from "@constants/permissions";
import { PERMISSIONS } from "@constants/permissions";
import type { UserRole } from "@constants/roles";
import { USER_ROLES } from "@constants/roles";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    /** نسخة مشفّرة لعرض كلمة المرور في لوحة الإدارة فقط */
    passwordEncrypted: {
      type: String,
      select: false,
      default: null,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "admin",
    },
    permissions: {
      type: [String],
      enum: PERMISSIONS,
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "super_admin" },
  },
);

export type UserDocument = Omit<
  InferSchemaType<typeof userSchema>,
  "role" | "permissions" | "passwordEncrypted" | "deletedAt" | "createdBy"
> & {
  _id: mongoose.Types.ObjectId;
  role: UserRole;
  permissions: Permission[];
  passwordEncrypted?: string | null;
  deletedAt?: Date | null;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SafeUser = Omit<UserDocument, "password" | "passwordEncrypted">;

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
