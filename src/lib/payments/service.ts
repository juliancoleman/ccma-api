import Bluebird from 'bluebird';
import { ApiError } from 'square';

import firebase from '../../config/firebase';
import withTimestamps, { Model } from '../../helpers/withTimestamps';

import { PaymentAlreadyExistsError, PaymentNotFoundError } from './errors';

import { getRegistrantById } from '../registrants/service';
import { getRegistration, registrationsRef } from '../registrations/service';
import { Payments } from '../../config/square';
import { CreatePaymentRequest } from 'square';

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
  customerId?: string; // Square Customer ID
  sourceId: string; // or Nonce
  amount: bigint; // no decimal places
  currency: string;
  locationId: string;
  idempotencyKey: string;
  statementDescriptionIdentifier: string;
}

export const paymentsRef = firebase.ref().child('payments');

/**
 * Given a payment payload, stores a new Payment in Firebase
 *
 * @param {Payment} payment a new payment payload
 * @throws if the sourceId is already used
 * @returns the newly created Payment from Firebase
 */
export const createPayment = Bluebird.method<Payment & Model>(
  async (payment: Payment) => {
    // Check if both the Registrant and the Registration
    // exist. If either fail, respective NotFound errors
    // are thrown and the function will exit. No results
    // from either function are not used nor required.
    await getRegistrantById(payment.registrantId);
    await getRegistration(payment.registrationId);

    const dbPayment = await paymentsRef
      .orderByChild('sourceId')
      .equalTo(payment.sourceId)
      .once('value');

    if (dbPayment.exists()) {
      throw new PaymentAlreadyExistsError(
        409,
        'A payment exists with the sourceId provided. To prevent a duplicate payment, your request refused to process.',
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
 * Given a just-created Firebase Payment payload, creates a
 * new Payment in Square. If the payment processing fails,
 * will also delete the associated Firebase Payment and
 * Registration. Upon successful payment, the `receiptUrl`
 * is appended to the Firebase Payment.
 *
 * @param {Payment} payment a payment that had just been created in Firebase
 * @throws if Square cannot process the payment
 * @returns the newly created Payment from Square
 */
export const createSquarePayment = Bluebird.method(async (payment: Payment) => {
  // first, transform the payment object from our flat
  // Firebase struct to the way Square prefers it
  const transformedPayment: CreatePaymentRequest = {
    sourceId: payment.sourceId as string,
    amountMoney: {
      amount: payment.amount as bigint,
      currency: payment.currency,
    },
    locationId: payment.locationId,
    idempotencyKey: payment.idempotencyKey as string,
    statementDescriptionIdentifier: payment.statementDescriptionIdentifier,
    note: `${payment.statementDescriptionIdentifier} ${payment.id}`,
    customerId: payment.customerId,
  };

  const { result } = await Payments.createPayment(transformedPayment).catch(
    async (err) => {
      // if the payment fails, remove the Payment and
      // Registration from Firebase. It's possible to create
      // these objects in Firebase _after_ Square has
      // processed the payment. The trade-offs are:
      //
      // 1. checking if a registrant can even register for an
      //    event and registering pre-emptively avoids the
      //    need to refund a card.
      // 2. removing Firebase objects is cheap
      // 3. Creating these objects after a successful Square
      //    payment means we cannot store Firebase
      //    object information after the fact (see
      //    https://developer.squareup.com/docs/payments-api/update-payments#general-considerations)
      if (err instanceof ApiError) {
        await paymentsRef.child(payment.id as string).remove();
        await registrationsRef.child(payment.registrationId as string).remove();
      }

      // Classic catch-and-rethrow with custom behavior
      throw err;
    },
  );

  const { payment: squarePayment } = result;

  await paymentsRef
    .child(payment.id as string)
    .update({ receiptUrl: squarePayment?.receiptUrl });

  return squarePayment;
});

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
