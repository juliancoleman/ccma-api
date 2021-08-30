import Bluebird from 'bluebird';

import firebase from '../../config/firebase';
import withTimestamps, { Model } from '../../helpers/withTimestamps';

import {
  RegistrantAlreadyExistsError,
  RegistrantNotFoundError,
} from './errors';

/**
 * Main structure for registrants.
 */
export interface Registrant {
  readonly id?: string;
  address: {
    addressLine1: string;
    addressLine2: string;
    state: string; // administrativeDistrictLevel1
    country: string;
    city: string; // locality
    postalCode: number;
  };
  church: string; // companyName
  emailAddress: string;
  lastName: string; // familyName
  firstName: string; // givenName
  phoneNumber: string;
}

const registrantsRef = firebase.ref().child('registrants');

/**
 * Given a registrant payload, stores a new Registrant in Firebase
 *
 * @param {Registrant} registrant a new registrant payload
 * @throws if the email registered already exists on a Registrant
 * @returns the newly created Registrant from Firebase
 */
export const createRegistrant = Bluebird.method<Registrant & Model>(
  async (registrant: Registrant) => {
    const dbRegistrant = await registrantsRef
      .orderByChild('emailAddress')
      .equalTo(registrant.emailAddress)
      .once('value');

    if (dbRegistrant.exists()) {
      throw new RegistrantAlreadyExistsError(
        409,
        'Email address already belongs to a Registrant',
      );
    }

    const createdRegistrantRef = await registrantsRef
      .push(withTimestamps(registrant))
      .once('value');
    const createdRegistrant = {
      id: createdRegistrantRef.key,
      ...createdRegistrantRef.val(),
    };

    return createdRegistrant;
  },
);

/**
 * Retrieves all Registrants from the Firebase database
 * TODO: enable filtering
 *
 * @returns all Registrants from Firebase
 */
export async function getRegistrants() {
  const registrants = await registrantsRef.once('value');
  const value: { [key: string]: Registrant } | null = registrants.val();

  // Either the /registrants ref exists but has no children,
  // OR the /registrants ref doesn't exist at all.
  if (value === null) {
    return [];
  }

  // Convert the resulting object to an array
  const parsedRegistrants = Object.keys(value).map((id) => ({
    ...value[id],
    id,
  }));

  return parsedRegistrants;
}

/**
 * Given a Firebase key, retrieves the Registrant if one exists.
 *
 * @param registrantId a /registrants child Firebase key
 * @throws if the registrant cannot be found at the given Firebase key
 * @returns the Registrant given a Firebase key
 */
export const getRegistrant = Bluebird.method<Registrant & Model>(
  async (registrantId: Registrant['id']) => {
    const dbRegistrant = await registrantsRef
      .child(registrantId as string)
      .once('value');

    if (!dbRegistrant.exists()) {
      throw new RegistrantNotFoundError(
        404,
        `Registrant not found whose key is "${registrantId}".`,
      );
    }

    const registrant = { ...dbRegistrant.val(), id: dbRegistrant.key };

    return registrant;
  },
);
