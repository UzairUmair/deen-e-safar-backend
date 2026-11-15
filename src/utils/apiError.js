export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export const missing = () => new ApiError(404, 'NOT_FOUND', 'The requested record was not found.');
export const conflict = () => new ApiError(409, 'SYNC_CONFLICT', 'Account data changed on another device. Refresh or explicitly retry your changes.');
