import { Joi, Segments } from 'celebrate';

import { createValidator as createRegistrantValidator } from '../registrants/validator';
import { createValidator as createEventValidator } from '../events/validator';

export const getManyValidator = {
  [Segments.QUERY]: Joi.object()
    .keys({
      sort: Joi.string()
        .trim()
        .valid('eventYear', 'balanceDue')
        .default('eventYear'),
      direction: Joi.string().trim().valid('asc', 'desc').default('desc'),
    })
    .unknown(false),
};

export const getSingleValidator = {
  [Segments.PARAMS]: Joi.object()
    .keys({
      registrationId: Joi.string().trim().required(),
    })
    .unknown(false),
};

export const createValidator = {
  [Segments.BODY]: Joi.object()
    .keys({
      registrantId: Joi.string().trim().required(),
      eventId: Joi.string().trim().required(),
      amenity: Joi.string()
        .trim()
        .valid('standard', 'deluxe', 'bunk', 'rv')
        .required(),
      roommateRequest: Joi.alternatives().try(
        Joi.string().trim().default(false),
        Joi.boolean().default(false),
      ),
      sundayLunch: Joi.boolean().required(),
    })
    .unknown(false),
};

export const fullRegistrationValidator = {
  [Segments.BODY]: Joi.object()
    .keys({
      event: createEventValidator.body,
      registrant: createRegistrantValidator.body,
      registration: Joi.object().keys({
        amenity: Joi.string()
          .trim()
          .valid('standard', 'deluxe', 'bunk', 'rv')
          .required(),
        roommateRequest: Joi.alternatives()
          .try(Joi.string().trim().default(false), Joi.boolean().default(false))
          .allow(null),
        sundayLunch: Joi.boolean().required(),
      }),
      payment: Joi.object().keys({
        sourceId: Joi.string().trim().required(),
        amount: Joi.number().integer().positive().required(),
        currency: Joi.string().trim().valid('USD').default('USD').optional(),
        locationId: Joi.string().trim().required(),
        idempotencyKey: Joi.string().trim().required(),
        statementDescriptionIdentifier: Joi.string().trim().required(),
      }),
    })
    .unknown(false),
};
