import { Customer, type CustomerDocument } from "./customer.model";

export const CustomerRepository = {
  findById(id: string) {
    return Customer.findById(id).lean<CustomerDocument>();
  },

  findByGoogleId(googleId: string) {
    return Customer.findOne({ googleId }).lean<CustomerDocument>();
  },

  findByEmail(email: string) {
    return Customer.findOne({ email: email.toLowerCase() }).lean<CustomerDocument>();
  },

  findMany(
    filter: Record<string, unknown>,
    options: {
      sort: Record<string, 1 | -1>;
      skip: number;
      limit: number;
    },
  ) {
    return Customer.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean<CustomerDocument[]>();
  },

  count(filter: Record<string, unknown>) {
    return Customer.countDocuments(filter);
  },

  async upsertFromGoogle(input: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string | null;
  }) {
    const email = input.email.toLowerCase();

    const existingByGoogle = await Customer.findOne({ googleId: input.googleId });
    if (existingByGoogle) {
      existingByGoogle.email = email;
      existingByGoogle.avatar = input.avatar ?? existingByGoogle.avatar ?? undefined;
      existingByGoogle.isActive = true;
      if (!existingByGoogle.name?.trim()) {
        existingByGoogle.name = input.name;
      }
      await existingByGoogle.save();
      return existingByGoogle as CustomerDocument;
    }

    const existingByEmail = await Customer.findOne({ email });
    if (existingByEmail) {
      // Link demo / legacy row to real Google account (same email)
      existingByEmail.googleId = input.googleId;
      existingByEmail.avatar = input.avatar ?? existingByEmail.avatar ?? undefined;
      existingByEmail.isActive = true;
      if (!existingByEmail.name?.trim()) {
        existingByEmail.name = input.name;
      }
      await existingByEmail.save();
      return existingByEmail as CustomerDocument;
    }

    return Customer.create({
      googleId: input.googleId,
      email,
      name: input.name,
      avatar: input.avatar ?? undefined,
      phone: "",
      address: "",
      isActive: true,
    }) as Promise<CustomerDocument>;
  },

  /** Dev-only helper: login/create by email without Google */
  async upsertDemoCustomer(input: {
    googleId: string;
    email: string;
    name: string;
  }) {
    const email = input.email.toLowerCase();
    const existing = await Customer.findOne({
      $or: [{ email }, { googleId: input.googleId }],
    });
    if (existing) {
      existing.email = email;
      if (!existing.name?.trim()) existing.name = input.name;
      existing.isActive = true;
      await existing.save();
      return existing as CustomerDocument;
    }
    return Customer.create({
      googleId: input.googleId,
      email,
      name: input.name,
      avatar: null,
      phone: "",
      address: "",
      isActive: true,
    }) as Promise<CustomerDocument>;
  },

  async updateCheckoutProfile(
    customerId: string,
    input: { name: string; phone: string; address?: string },
  ) {
    const customer = await Customer.findById(customerId);
    if (!customer) return null;
    customer.name = input.name.trim();
    customer.phone = input.phone.trim();
    if (input.address !== undefined) {
      customer.address = input.address.trim();
    }
    await customer.save();
    return customer as CustomerDocument;
  },
};
