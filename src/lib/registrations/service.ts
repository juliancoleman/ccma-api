import Bluebird from 'bluebird';
import { Payment as SquarePayment, SearchCustomersRequest } from 'square';

import firebase from '../../config/firebase';
import { sendEmail } from '../../config/sendgrid';
import { Customers } from '../../config/square';

import withTimestamps, { Model } from '../../helpers/withTimestamps';
import Amenities from '../../helpers/amenities';

import {
  RegistrantAlreadyRegisteredError,
  RegistrationNotFoundError,
} from './errors';

import {
  getRegistrantById,
  Registrant,
  upsertRegistrant,
} from '../registrants/service';
import { getEvent, Event, eventsRef } from '../events/service';
import {
  Payment,
  createPayment,
  createSquarePayment,
} from '../payments/service';

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

export const registrationsRef = firebase.ref().child('registrations');

/**
 * Given a registration payload, stores a new Registration in Firebase
 *
 * @param {Registration} registration a new registration payload
 * @throws if the registrant doesn't exist, or if the registrant is already registered for the event.
 * @returns the newly created Registration from Firebase
 */
export const createRegistration = Bluebird.method<Registration & Model>(
  async (registration: Registration) => {
    const registrant = await getRegistrantById(registration.registrantId);
    const event = await getEvent(registration.eventId);

    const dbRegistrations = await registrationsRef
      .orderByChild('registrantId')
      .equalTo(registrant.id ?? null)
      .once('value');

    if (dbRegistrations.exists()) {
      const existingRegistrations = dbRegistrations.val();
      const parsedRegistrations = Object.keys(existingRegistrations).map(
        (id) => ({
          ...existingRegistrations[id],
          id,
        }),
      );

      if (
        parsedRegistrations.some((reg) => reg.eventId === registration.eventId)
      ) {
        throw new RegistrantAlreadyRegisteredError(
          409,
          `Registrant is already registered for ${event.year}`,
        );
      }
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

export interface FullRegistration {
  event?: Event & Model;
  registrant: Registrant & Model;
  registration: Registration & Model;
  payment: Payment & Model & Partial<SquarePayment>;
}

/**
 * Given a full registration object (Registrant,
 * Registration, and Payment), creates all necessary
 * Firebase documents and registers the user for the most
 * recent available event.
 *
 * If the provided email already belongs to a Registrant,
 * updates the document for the Registrant with the
 * payload provided.
 *
 * @param registration a full registration object, including Registrant and Payment information
 * @throws if the payment does not include a `sourceId` or if the registrant has already registered for the requested year
 * @returns the full registrant object with associated Firebase keys
 */
export const newRegistration = Bluebird.method<FullRegistration>(
  async (registration: FullRegistration) => {
    // First, either insert or update the Registrant in Firebase
    const dbRegistrant = await upsertRegistrant(registration.registrant);

    // search or insert a new Square customer.
    const searchQuery: SearchCustomersRequest = {
      query: {
        filter: {
          emailAddress: {
            exact: registration.registrant.emailAddress,
          },
        },
      },
    };

    // Fetch or create a Customer in Square. If duplicates
    // are present during search, we get an array. Just get
    // the first Customer. Managing Customers is not the
    // responsibility of this API.
    const customer = await Customers.searchCustomers(searchQuery).then(
      async ({ result }) => {
        const { customers } = result;

        if (customers != null && customers.length) {
          return customers[0];
        }

        const { registrant } = registration;

        // This is going to get pretty verbose... For
        // reference, just look at the Registrant interface
        // to see what maps to what. The fields provided
        // are the bare minimum (if not more) then what
        // Square needs to create a Customer. But we need
        // to transform layman key names to more technical
        // ones.
        const { result: createdResult } = await Customers.createCustomer({
          address: {
            addressLine1: registrant.address.addressLine1,
            addressLine2: registrant.address.addressLine2,
            country: registrant.address.country,
            administrativeDistrictLevel1: registrant.address.state,
            locality: registrant.address.city,
            postalCode: String(registrant.address.postalCode), // Square expects this as a String for whatever reason...
          },
          companyName: registrant.church,
          emailAddress: registrant.emailAddress,
          familyName: registrant.lastName,
          givenName: registrant.firstName,
          phoneNumber: registrant.phoneNumber,
        });

        return createdResult.customer;
      },
    );

    // Get the last-created Event from Firebase
    const dbAvailableEvent = (
      await eventsRef.limitToLast(1).once('value')
    ).val();

    const eventId = Object.keys(dbAvailableEvent)[0];
    const event = { ...dbAvailableEvent[eventId], id: eventId };

    // attempt to create the registration. If the registrant
    // has already registered, an error will be thrown and
    // the function will exit.
    const createdRegistration = await createRegistration({
      ...registration.registration,
      registrantId: dbRegistrant.id,
      eventId,
    });

    // attempt to create the paymet. If the idempotencyKey
    // has already been used, an error will be thrown and
    // the function will exit.
    const createdPayment = await createPayment({
      ...registration.payment,
      registrantId: dbRegistrant.id,
      registrationId: createdRegistration.id,
      customerId: customer?.id,
    });

    // Process the Square Payment with all associated fields.
    const squarePayment = await createSquarePayment({
      ...createdPayment,
      customerId: customer?.id,
    });

    const result: FullRegistration = {
      registrant: dbRegistrant,
      registration: createdRegistration,
      payment: { ...createdPayment, receiptUrl: squarePayment?.receiptUrl },
      event,
    };

    await sendEmail({
      templateName: 'registration_receipt',
      to: result.registrant.emailAddress,
      Registrant_Name: `${result.registrant.firstName} ${result.registrant.lastName}`,
      Registrant_Amenity: result.registration.amenity,
      Registrant_Roommate_Request:
        result.registration.roommateRequest || 'None specified',
      Registrant_Sunday_Lunch: result.registration.sundayLunch ? 'Yes' : 'No',
      // result.event is only optional becuase the interface
      // declares it as such. It will always exists in this case.
      Event_Year: result.event?.year,
      Registration_Receipt_Url: result.payment.receiptUrl,
    });

    return result;
  },
);
