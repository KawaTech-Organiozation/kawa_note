export const successResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data
});

export const errorResponse = (message, code = 'ERROR', statusCode = 400) => ({
  success: false,
  error: {
    message,
    code,
    statusCode
  }
});

export const paginatedResponse = (data, pagination) => ({
  success: true,
  data,
  pagination: {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages: Math.ceil(pagination.total / pagination.limit)
  }
});
