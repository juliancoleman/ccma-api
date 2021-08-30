import NamedError from '@juliancoleman/named-error';

/**
 * Throws when the Registration is not found in the database
 */
export class RegistrationNotFoundError extends NamedError {}

/**
 * Throws when a Registration exists for the given
 * Registrant and an `eventYear`. A Registrant may be
 * registered to multiple events, but cannot register for
 * the same event for the same year.
 */
export class RegistrantAlreadyRegisteredError extends NamedError {}
