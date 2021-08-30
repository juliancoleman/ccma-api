import NamedError from '@juliancoleman/named-error';

/**
 * Throws when a Registrant is not found in the database
 */
export class RegistrantNotFoundError extends NamedError {}

/**
 * Throws when a Registrant already exists with the email
 * provided.
 */
export class RegistrantAlreadyExistsError extends NamedError {}
