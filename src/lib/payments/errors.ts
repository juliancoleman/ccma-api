import NamedError from '@juliancoleman/named-error';

/**
 * Throws when a Payment is not found in the database
 */
export class PaymentNotFoundError extends NamedError {}

/**
 * Throws when a Payment already exists with the
 * idempotency key provided.
 */
export class PaymentAlreadyExistsError extends NamedError {}
