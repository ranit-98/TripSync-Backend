import { HttpStatus } from '@nestjs/common';

export const HTTP_STATUS = {
  OK: HttpStatus.OK,
  CREATED: HttpStatus.CREATED,
  NO_CONTENT: HttpStatus.NO_CONTENT,
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  INTERNAL_SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
} as const;
