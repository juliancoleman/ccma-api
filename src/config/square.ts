import { Client, Environment } from 'square';

const { SQUARE_ENVIRONMENT = 'Sandbox', SQUARE_ACCESS_TOKEN = '' } =
  process.env;

const client = new Client({
  environment: Environment[SQUARE_ENVIRONMENT as keyof typeof Environment],
  accessToken: SQUARE_ACCESS_TOKEN,
});

export const Payments = client.paymentsApi;
export const Customers = client.customersApi;
