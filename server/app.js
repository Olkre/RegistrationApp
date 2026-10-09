const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const { errorHandler, badRequest, unauthenticated } = require('./errors');
const auth = require('./auth');
// const registration = require('./registration');
// const { requireObjectBody, requireString, requireCourseId } = require('./validation');

function createApp(db) {
  const app = new Koa();
  const router = new Router({ prefix: '/api' });
  const requireAuth = auth.requireAuth(db);





  app.use(errorHandler);
  app.use(
    bodyParser({
      enableTypes: ['json'],
      jsonLimit: '10kb',
      onerror: () => {
        throw badRequest('INVALID_JSON', 'The request body is not valid JSON.');
      },
    })
  );
  app.use(router.routes());

  return app;
}

module.exports = { createApp };
