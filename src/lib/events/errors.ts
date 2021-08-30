import NamedError from '@juliancoleman/named-error';

/**
 * Throws when an Event is not found in the database
 */
export class EventNotFoundError extends NamedError {}

/**
 * Throws when an Event already exists with the year
 * provided.
 */
export class EventAlreadyExistsError extends NamedError {}
