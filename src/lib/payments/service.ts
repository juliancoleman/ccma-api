import Bluebird from 'bluebird';

import firebase from '../../config/firebase';
import withTimestamps, { Model } from '../../helpers/withTimestamps';

import { PaymentAlreadyExistsError, PaymentNotFoundError } from './errors';

import { getRegistrant } from '../registrants/service';
import { getRegistration } from '../registrations/service';

/**
 * Main structure for Payment
 *
 * This structure is partial to what Square actually stores.
 * Square will store all Registrant, Registration, and Payment
 * data in the same object. In Firebase, this is stored as
 * three separate documents in three separate collections.
 */
export interface Payment {
  readonly id?: string;
  registrantId: string; // Firebase Registrant ID
  registrationId: string; // Firebase Registration ID
  sourceId: string; // or Nonce
  amount: number; // no decimal places
  currency: string;
  locationId: string;
  idempotencyKey: string;
  statementDescriptionIdentifier: string;
}

const paymentsRef = firebase.ref().child('payments');

/**
 * Given a payment payload, stores a new Payment in Firebase
 *
 * @param {Payment} payment a new payment payload
 * @throws if the idempotency key is already used
 * @returns the newly created Payment from Firebase
 */
export const createPayment = Bluebird.method<Payment & Model>(
  async (payment: Payment) => {
    // Check if both the Registrant and the Registration
    // exist. If either fail, respective NotFound errors
    // are thrown and the function will exit. No results
    // from either function are not used nor required.
    await getRegistrant(payment.registrantId);
    await getRegistration(payment.registrationId);

    const dbPayment = await paymentsRef
      .orderByChild('idempotencyKey')
      .equalTo(payment.idempotencyKey)
      .once('value');

    if (dbPayment.exists()) {
      throw new PaymentAlreadyExistsError(
        409,
        'A payment exists with the idempotency key provided. To prevent a duplicate payment, your request refused to process.',
      );
    }

    const createdPaymentRef = await paymentsRef
      .push(withTimestamps(payment))
      .once('value');
    const createdPayment = {
      id: createdPaymentRef.key,
      ...createdPaymentRef.val(),
    };

    return createdPayment;
  },
);

/**
 * Retrieves all Payments from the Firebase database
 * TODO: enable filtering
 *
 * @returns all Payments from Firebase
 */
export async function getPayments() {
  const payments = await paymentsRef.once('value');
  const value: { [key: string]: Payment } | null = payments.val();

  // Either the /payments ref exists but has no children,
  // OR the /payments ref doesn't exist at all.
  if (value === null) {
    return [];
  }

  // Convert the resulting object to an array
  const parsedPayments = Object.keys(value).map((id) => ({
    ...value[id],
    id,
  }));

  return parsedPayments;
}

/**
 * Given a Firebase key, retrieves the Payment if one exists
 *
 * @param paymentId a /payments child Firebase key
 * @throws if the payment cannot be found at the given Firebase key
 * @returns the Payment given a Firebase key
 */
export const getPayment = Bluebird.method<Payment & Model>(
  async (paymentId: Payment['id']) => {
    const dbPayment = await paymentsRef
      .child(paymentId as string)
      .once('value');

    if (!dbPayment.exists()) {
      throw new PaymentNotFoundError(
        404,
        `Payment not found whose key is "${paymentId}".`,
      );
    }

    const payment = { ...dbPayment.val(), id: dbPayment.key };

    return payment;
  },
);
