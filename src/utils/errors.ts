// Typed error taxonomy. The popup maps codes to human-friendly messages.

export type ErrorCode =
  | 'NO_API_KEY'
  | 'RESTRICTED_PAGE'
  | 'EMPTY_CONTENT'
  | 'API_ERROR'
  | 'INVALID_RESPONSE'
  | 'NO_ACTIVE_TAB'
  | 'INJECTION_FAILED'
  | 'UNKNOWN';

export class AppError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
  }

  toSerializable(): { code: ErrorCode; message: string } {
    return { code: this.code, message: this.message };
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new AppError('UNKNOWN', message);
}
