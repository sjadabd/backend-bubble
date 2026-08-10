export {
  Customer,
  toCustomerDto,
  toAdminCustomerDto,
  type CustomerDocument,
  type StoreCustomer,
  type AdminCustomer,
} from "./customer.model";
export { CustomerRepository } from "./customer.repository";
export { customerRoutes } from "./customer.routes";
export {
  getTopCustomerByOrders,
  listGoogleCustomers,
  type TopCustomerByOrders,
} from "./customer.service";
