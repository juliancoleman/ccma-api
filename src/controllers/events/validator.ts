import { Joi, Segments } from 'celebrate';

export const getManyValidator = {
  [Segments.QUERY]: Joi.object()
    .keys({
      sort: Joi.string().trim().valid('year', 'createdAt').default('createdAt'),
      direction: Joi.string().trim().valid('asc', 'desc').default('desc'),
    })
    .unknown(false),
};

export const getSingleValidator = {
  [Segments.PARAMS]: Joi.object()
    .keys({
      eventId: Joi.string().trim().required(),
    })
    .unknown(false),
};

export const createValidator = {
  [Segments.BODY]: Joi.object()
    .keys({
      year: Joi.number().min(new Date().getFullYear()).required(),
    })
    .unknown(false),
};
