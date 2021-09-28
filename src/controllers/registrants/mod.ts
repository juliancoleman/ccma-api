import { Router } from 'express';
import { celebrate } from 'celebrate';

import { methodNotImplemented } from '../../helpers/middleware/methodNotImplemented';

import * as Validator from './validator';
import * as Errors from '../../lib/registrants/errors';
import * as Service from '../../lib/registrants/service';

const router = Router();

router.get(
  '/',
  celebrate(Validator.getManyValidator),
  async (_req, res, _next) => {
    Service.getRegistrants()
      .then((registrants) => res.send(registrants))
      .catch((err: Error) => res.status(500).send(err));
  },
);

router.get(
  '/:registrantId',
  celebrate(Validator.getSingleValidator),
  async (req, res, _next) => {
    Service.getRegistrantById(req.params.registrantId)
      .then((registrant) => res.send(registrant))
      .catch(
        Errors.RegistrantNotFoundError,
        (err: Errors.RegistrantNotFoundError) =>
          res.status(err.code).send({ ...err, message: err.message }),
      );
  },
);

router.post(
  '/',
  celebrate(Validator.createValidator),
  async (req, res, _next) => {
    Service.createRegistrant(req.body)
      .then((registrant) => res.status(200).send(registrant))
      .catch(
        Errors.RegistrantAlreadyExistsError,
        (err: Errors.RegistrantAlreadyExistsError) =>
          res.status(err.code).send({ ...err, message: err.message }),
      );
  },
);

router.all('*', methodNotImplemented);

export default router;
