import { Router } from 'express';
import { celebrate } from 'celebrate';

import { methodNotImplemented } from '../../helpers/middleware/methodNotImplemented';

import * as Validator from './validator';
import * as PaymentErrors from '../../lib/payments/errors';
import * as RegistrantErrors from '../../lib/registrants/errors';
import * as RegistrationErrors from '../../lib/registrations/errors';
import * as Service from '../../lib/payments/service';

const router = Router();

router.get(
  '/',
  celebrate(Validator.getManyValidator),
  async (_req, res, _next) => {
    Service.getPayments()
      .then((payments) => res.send(payments))
      .catch((err: Error) => res.status(500).send(err));
  },
);

router.get(
  '/:paymentId',
  celebrate(Validator.getSingleValidator),
  async (req, res, _next) => {
    Service.getPayment(req.params.paymentId)
      .then((payment) => res.send(payment))
      .catch(
        PaymentErrors.PaymentNotFoundError,
        (err: PaymentErrors.PaymentNotFoundError) =>
          res.status(err.code).send({ ...err, message: err.message }),
      );
  },
);

router.post(
  '/',
  celebrate(Validator.createValidator),
  async (req, res, _next) => {
    Service.createPayment(req.body)
      .then((payment) => res.status(200).send(payment))
      .catch(
        PaymentErrors.PaymentAlreadyExistsError,
        RegistrantErrors.RegistrantNotFoundError,
        RegistrationErrors.RegistrationNotFoundError,
        (
          err:
            | PaymentErrors.PaymentAlreadyExistsError
            | RegistrantErrors.RegistrantNotFoundError
            | RegistrationErrors.RegistrationNotFoundError,
        ) => res.status(err.code).send({ ...err, message: err.message }),
      );
  },
);

router.all('*', methodNotImplemented);

export default router;
