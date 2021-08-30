import { Request, Response, NextFunction } from 'express';
import NamedError from '@juliancoleman/named-error';

export class ResourceNotExistsError extends NamedError {}

export function resourceNotExists(
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const err = new ResourceNotExistsError(
    404,
    `${req.method} ${req.originalUrl} is a valid endpoint, but the resource does not exist.`,
  );

  res.status(404).send({ ...err, message: err.message });
}
