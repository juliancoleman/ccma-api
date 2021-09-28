import { Joi, Segments } from 'celebrate';

export const getManyValidator = {
  [Segments.QUERY]: Joi.object()
    .keys({
      sort: Joi.string()
        .trim()
        .valid('amount', 'createdAt')
        .default('createdAt'),
      direction: Joi.string().trim().valid('asc', 'desc').default('asc'),
    })
    .unknown(false),
};

export const getSingleValidator = {
  [Segments.PARAMS]: Joi.object()
    .keys({
      paymentId: Joi.string().trim().required(),
    })
    .unknown(false),
};

export const createValidator = {
  [Segments.BODY]: Joi.object()
    .keys({
      registrantId: Joi.string().trim().required(),
      registrationId: Joi.string().trim().required(),
      sourceId: Joi.string().trim().required(),
      amount: Joi.number().integer().positive().required(),
      currency: Joi.string().trim().valid('USD').default('USD').optional(),
      locationId: Joi.string().trim().required(),
      idempotencyKey: Joi.string()
        .trim()
        .uuid({ version: 'uuidv4' })
        .required(),
      statementDescriptionIdentifier: Joi.string().trim().max(20).required(),
    })
    .unknown(false),
};
