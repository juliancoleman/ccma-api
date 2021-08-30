import Bluebird from 'bluebird';
import firebase from '../../config/firebase';
import withTimestamps, { Model } from '../../helpers/withTimestamps';

import {
  RegistrantAlreadyRegisteredError,
  RegistrationNotFoundError,
} from './errors';
import { getRegistrant } from '../registrants/service';
import Amenities from '../../helpers/amenities';
import { getEvent } from '../events/service';

/**
 * Main structure for registrations
 *
 * * no need to store total. We know the price of the
 *   amenity and the price of the deposit. Sum the two and
 *   you have the total.
 */
export interface Registration {
  readonly id?: string;
  registrantId: string; // Firebase Registrant ID
  eventId: string; // Firebase Event ID
  amenity: string;
  roommateRequest?: string | boolean;
  sundayLunch: Boolean;
  balanceDue?: number;
}

const registrationsRef = firebase.ref().child('registrations');

/**
 * Given a registration payload, stores a new Registration in Firebase
 *
 * @param {Registration} registration a new registration payload
 * @throws if the registrant doesn't exist, or if the registrant is already registered for the event.
 * @returns the newly created Registration from Firebase
 */
export const createRegistration = Bluebird.method<Registration & Model>(
  async (registration: Registration) => {
    const registrant = await getRegistrant(registration.registrantId);
    const event = await getEvent(registration.eventId);

    const dbRegistration = await registrationsRef
      .orderByChild('registrantId')
      .equalTo(registrant.id ?? null)
      .once('value');

    if (dbRegistration.exists()) {
      throw new RegistrantAlreadyRegisteredError(
        409,
        `Registrant is already registered for ${event.year}`,
      );
    }

    const registrationObj = {
      ...registration,
      balanceDue: Amenities[registration.amenity as keyof typeof Amenities],
    };

    if (!registration.roommateRequest) {
      registrationObj.roommateRequest = false;
    }

    const createdRegistrationRef = await registrationsRef
      .push(withTimestamps(registrationObj))
      .once('value');
    const createdRegistration = {
      id: createdRegistrationRef.key,
      ...createdRegistrationRef.val(),
    };

    return createdRegistration;
  },
);

/**
 * Retrieves all Registrations from the Firebase database
 * TODO: enable filtering
 *
 * @returns all Registrations from Firebase
 */
export async function getRegistrations() {
  const registrations = await registrationsRef.once('value');
  const value: { [key: string]: Registration } | null = registrations.val();

  // Either the /registrations ref exists but has no children,
  // OR the /registrations ref doesn't exist at all.
  if (value === null) {
    return [];
  }

  const parsedRegistrations = Object.keys(value).map((id) => ({
    ...value[id],
    id,
  }));

  return parsedRegistrations;
}

/**
 * Given a firebase key, retrieves the Registration if one exists
 *
 * @param registrationId a /registrations child Firebase key
 * @throws if the Registration cannot be found at the given Firebase key
 * @returns the Registration given a Firebase key
 */
export const getRegistration = Bluebird.method<Registration & Model>(
  async (registrationId: Registration['id']) => {
    const dbRegistration = await registrationsRef
      .child(registrationId as string)
      .once('value');

    if (!dbRegistration.exists()) {
      throw new RegistrationNotFoundError(
        404,
        `Registration not found whose key is "${registrationId}".`,
      );
    }

    const registration = {
      ...dbRegistration.val(),
      id: dbRegistration.key,
    };

    return registration;
  },
);
