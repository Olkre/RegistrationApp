const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const { errorHandler, badRequest, unauthenticated } = require('./errors');
const auth = require('./auth');
// const registration = require('./registration');
// const { requireObjectBody, requireString, requireCourseId } = require('./validation');

const cors = require('@koa/cors');

function createApp(db) {
  const app = new Koa();
  const router = new Router({ prefix: '/api' });
  const requireAuth = auth.requireAuth(db);

  // disabled auth for now
  router.get('/courses', async (ctx) => {
    const courses = db.prepare('SELECT * FROM courses').all();
    ctx.body = { courses };
  });

  router.get('/course/:id', async (ctx) => {
    const id = ctx.params.id;
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    console.log("course called")
    console.log(course)
    ctx.body = { course };
  });

  // fix cors bug from client
  app.use(cors({
     origin: 'http://localhost:5173',
     credentials: true,
   }));

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
