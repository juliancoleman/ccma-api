import { Router } from 'express';
import { celebrate } from 'celebrate';
import { ApiError } from 'square';

import { methodNotImplemented } from '../../helpers/middleware/methodNotImplemented';

import * as Validator from './validator';
import * as PaymentErrors from '../../lib/payments/errors';
import * as RegistrantErrors from '../../lib/registrants/errors';
import * as RegistrationErrors from '../../lib/registrations/errors';
import * as Service from '../../lib/registrations/service';

const router = Router();

router.get(
  '/',
  celebrate(Validator.getManyValidator),
  async (_req, res, _next) => {
    Service.getRegistrations()
      .then((registrations) => res.send(registrations))
      .catch((err: Error) => res.status(500).send(err));
  },
);

router.get(
  '/:registrationId',
  celebrate(Validator.getSingleValidator),
  async (req, res, _next) => {
    Service.getRegistration(req.params.registrationId)
      .then((registration) => res.send(registration))
      .catch(
        RegistrationErrors.RegistrationNotFoundError,
        (err: RegistrationErrors.RegistrationNotFoundError) =>
          res.status(err.code).send({ ...err, message: err.message }),
      );
  },
);

router.post(
  '/',
  celebrate(Validator.createValidator),
  async (req, res, _next) => {
    Service.createRegistration(req.body)
      .then((registratation) => res.status(200).send(registratation))
      .catch(
        RegistrantErrors.RegistrantNotFoundError,
        RegistrationErrors.RegistrantAlreadyRegisteredError,
        (err: RegistrationErrors.RegistrantAlreadyRegisteredError) =>
          res.status(err.code).send({ ...err, message: err.message }),
      );
  },
);

router.post(
  '/new',
  celebrate(Validator.fullRegistrationValidator),
  async (req, res, _next) => {
    Service.newRegistration(req.body)
      .then((registration) => res.status(200).send(registration))
      .catch(
        RegistrantErrors.RegistrantAlreadyExistsError,
        RegistrationErrors.RegistrantAlreadyRegisteredError,
        PaymentErrors.PaymentAlreadyExistsError,
        ApiError,
        (
          err:
            | RegistrantErrors.RegistrantAlreadyExistsError
            | RegistrationErrors.RegistrantAlreadyRegisteredError
            | PaymentErrors.PaymentAlreadyExistsError
            | ApiError,
        ) => {
          if (err instanceof ApiError) {
            res.status(err.statusCode).send(err.errors);
          } else {
            res.status(err.code).send({ ...err, message: err.message });
          }
        },
      );
  },
);

router.all('*', methodNotImplemented);

export default router;
