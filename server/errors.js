// server/errors.js

class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function badRequest(code, message) {
  return new AppError(400, code, message);
}

function unauthenticated(code = 'UNAUTHENTICATED', message = 'Authentication required.') {
  return new AppError(401, code, message);
}

async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    console.error(err)
    ctx.status = err.status || 500;
    ctx.body = {
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred.',
      },
    };
  }
}

module.exports = {
  AppError,
  errorHandler,
  badRequest,
  unauthenticated,
};
