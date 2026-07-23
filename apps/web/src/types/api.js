/**
 * @typedef {Object} ApiSuccessResponse
 * @template T
 * @property {boolean} success - Always true for success responses
 * @property {string} [message] - Success message
 * @property {T} data - Response data
 * @property {{ page: number, limit: number, total: number, totalPages: number }} [pagination] - Pagination payload when available
 */

/**
 * @typedef {Object} ApiErrorDetail
 * @property {string} message - Error message
 * @property {string} [code] - Error code
 * @property {number} [statusCode] - HTTP status code
 */

/**
 * @typedef {Object} ApiErrorResponse
 * @property {boolean} success - Always false for error responses
 * @property {ApiErrorDetail} error - Error details
 */

/**
 * @template T
 * @typedef {ApiSuccessResponse<T> | ApiErrorResponse} ApiResponse
 */

export {};
