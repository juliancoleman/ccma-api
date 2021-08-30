import { Request, Response, NextFunction } from 'express';
import NamedError from '@juliancoleman/named-error';

export class MethodNotImplementedError extends NamedError {}

export function methodNotImplemented(
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const err = new MethodNotImplementedError(
    501,
    `Resource ${req.originalUrl} exists but has no method ${req.method}.`,
  );

  res.status(501).send({ ...err, message: err.message });
}
