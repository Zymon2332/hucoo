export const SUCCESS_CODE = 200;

export interface Result<T> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
  timestamp?: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

export class ApiError extends Error {
  readonly code: number;
  readonly traceId?: string;
  readonly details?: unknown;

  constructor(code: number, message: string, traceId?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.traceId = traceId;
    this.details = details;
  }
}
