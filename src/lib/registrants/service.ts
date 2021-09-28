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
    postalCode: string;
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
 * Given a registrant payload, stores a new Registrant in
 * Firebase if one doesn't already exist. If the Registrant
 * exists, updates all fields and returns the updated
 * Registrant
 *
 * @param {Registrant} registrant a new registrant payload
 * @returns the newly created or updated Registrant from Firebase
 */
export const upsertRegistrant = Bluebird.method<Registrant & Model>(
  async (registrant: Registrant) => {
    return createRegistrant(registrant)
      .then((registrant) => registrant)
      .catch(RegistrantAlreadyExistsError, async (_err) => {
        const dbRegistrant = await getRegistrantByEmail(
          registrant.emailAddress,
        );
        const { id, ...rest } = dbRegistrant;

        const updatedRegistrant: Registrant & Model = {
          ...rest,
          ...registrant,
          updatedAt: new Date().toISOString(),
        };

        // update the Registrant, but this always returns
        // void. Firebase cannot update and return the
        // updated document in the same call.
        await registrantsRef
          .child(dbRegistrant.id as string)
          .update(updatedRegistrant);

        return { ...updatedRegistrant, id };
      });
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
export const getRegistrantById = Bluebird.method<Registrant & Model>(
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

/**
 * Given an email address, retrieves the Registrant if one exists.
 *
 * @param emailAddress a registrant's email address
 * @throws if the registrant cannot be found at the given email address
 * @returns the Registrant given an email address
 */
export const getRegistrantByEmail = Bluebird.method<Registrant & Model>(
  async (emailAddress: Registrant['emailAddress']) => {
    const dbRegistrant = await registrantsRef
      .orderByChild('emailAddress')
      .equalTo(emailAddress)
      .once('value');

    if (!dbRegistrant.exists()) {
      throw new RegistrantNotFoundError(
        404,
        `Registrant not found whose email is "${emailAddress}".`,
      );
    }

    // Transform the dbRegistrant to put the key on the object itself

    const registrant = dbRegistrant.val();
    const id = Object.keys(registrant)[0];
    const parsedRegistrant = {
      id,
      ...registrant[id],
    };

    return parsedRegistrant;
  },
);
