import { Joi, Segments } from 'celebrate';

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
      roommateRequest: Joi.string().trim().default(null),
      sundayLunch: Joi.boolean().required(),
    })
    .unknown(false),
};
