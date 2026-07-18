import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: 'Not found', message: `No endpoint matches ${req.method} ${req.path}.` });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid request', message: 'Please check the submitted fields.', details: error.flatten() });
  }

  if (error instanceof Error && error.message === 'Blocked by CORS policy') {
    return res.status(403).json({ error: 'Forbidden', message: 'This origin is not allowed to access the API.' });
  }

  console.error('Unhandled request error:', error);
  return res.status(500).json({ error: 'Internal server error', message: 'Something went wrong. Please try again.' });
}
