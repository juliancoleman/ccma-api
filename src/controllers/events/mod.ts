import { Router } from 'express';
import { celebrate } from 'celebrate';

import { methodNotImplemented } from '../../helpers/middleware/methodNotImplemented';

import * as Validator from './validator';
import * as Errors from '../../lib/events/errors';
import * as Service from '../../lib/events/service';

const router = Router();

router.get('/', celebrate(Validator.getManyValidator), (_req, res, _next) => {
  Service.getEvents()
    .then((events) => res.send(events))
    .catch((err: Error) => res.status(500).send(err));
});

router.get(
  '/:eventId',
  celebrate(Validator.getSingleValidator),
  (req, res, _next) => {
    Service.getEvent(req.params.eventId)
      .then((event) => res.send(event))
      .catch(Errors.EventNotFoundError, (err: Errors.EventNotFoundError) =>
        res.status(err.code).send({ ...err, message: err.message }),
      );
  },
);

router.post('/', celebrate(Validator.createValidator), (req, res, _next) => {
  Service.createEvent(req.body)
    .then((event) => res.status(200).send(event))
    .catch(
      Errors.EventAlreadyExistsError,
      (err: Errors.EventAlreadyExistsError) =>
        res.status(err.code).send({ ...err, message: err.message }),
    );
});

router.all('*', methodNotImplemented);

export default router;
