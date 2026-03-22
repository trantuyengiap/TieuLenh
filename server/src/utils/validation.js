import { ZodError } from 'zod';
import { createHttpError } from './httpError.js';

export function parseOrThrow(schema, payload) {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw createHttpError(400, 'Invalid request data', error.flatten());
    }
    throw error;
  }
}
