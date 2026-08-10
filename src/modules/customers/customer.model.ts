import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const customerSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    avatar: { type: String, default: null },
    phone: { type: String, default: "", trim: true, maxlength: 30 },
    address: { type: String, default: "", trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CustomerDocument = InferSchemaType<typeof customerSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Customer: Model<CustomerDocument> =
  mongoose.models.Customer ??
  mongoose.model<CustomerDocument>("Customer", customerSchema);

export function toCustomerDto(customer: CustomerDocument) {
  return {
    id: customer._id.toString(),
    email: customer.email,
    name: customer.name,
    avatar: customer.avatar ?? null,
    phone: customer.phone?.trim() ? customer.phone : null,
    address: customer.address?.trim() ? customer.address : null,
    createdAt: customer.createdAt.toISOString(),
  };
}

export function toAdminCustomerDto(customer: CustomerDocument) {
  return {
    id: customer._id.toString(),
    googleId: customer.googleId,
    email: customer.email,
    name: customer.name,
    avatar: customer.avatar ?? null,
    phone: customer.phone?.trim() ? customer.phone : null,
    address: customer.address?.trim() ? customer.address : null,
    isActive: Boolean(customer.isActive),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export type StoreCustomer = ReturnType<typeof toCustomerDto>;
export type AdminCustomer = ReturnType<typeof toAdminCustomerDto>;
