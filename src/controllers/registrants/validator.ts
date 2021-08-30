import { Joi, Segments } from 'celebrate';

export const getManyValidator = {
  [Segments.QUERY]: Joi.object()
    .keys({
      sort: Joi.string()
        .trim()
        .valid('emailAddress', 'createdAt')
        .default('createdAt'),
      direction: Joi.string().trim().valid('asc', 'desc').default('asc'),
    })
    .unknown(false),
};

export const getSingleValidator = {
  [Segments.PARAMS]: Joi.object()
    .keys({
      registrantId: Joi.string().trim().required(),
    })
    .unknown(false),
};

export const createValidator = {
  [Segments.BODY]: Joi.object()
    .keys({
      address: Joi.object()
        .keys({
          addressLine1: Joi.string().trim().required(),
          addressLine2: Joi.string().trim().default('').optional(),
          state: Joi.string().trim().max(2).required(),
          country: Joi.string().trim().required(),
          city: Joi.string().trim().required(),
          postalCode: Joi.number()
            .integer()
            .positive()
            .min(10000)
            .max(99999)
            .required(),
        })
        .required(),
      church: Joi.string().trim().required(),
      emailAddress: Joi.string().trim().email().required(),
      lastName: Joi.string().trim().required(),
      firstName: Joi.string().trim().required(),
      phoneNumber: Joi.string()
        .trim()
        .pattern(/\(?([0-9]{3})\)?([ .-]?)([0-9]{3})\2([0-9]{4})/),
    })
    .unknown(false),
};
