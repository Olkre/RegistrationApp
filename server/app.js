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

  // auth routes
  // POST  /api/login   Log in with { "email", "password" }; sets the session cookie | 200 { user }
  router.post('/login', async (ctx) => {
    const { email, password } = ctx.request.body;

    const user = await auth.verifyCredentials(db, email, password);

    console.log("trying to sign in ", email);

    if (!user) {
      throw unauthenticated('unauthenticated', 'wrong credentials');
    }

    const token = auth.createSession(db, user.id);
    auth.setSessionCookie(ctx, token);

    ctx.status = 200;
    ctx.body = { user };
  });

  router.post('/login', async (ctx) => {
    const body = ctx.request.body;
    const user = await auth.verifyCredentials(db, body.email.trim(), body.password);

    if (!user) {
      throw unauthenticated('UNAUTHENTICATED', 'Email or password is incorrect.');
    }

    const token = auth.createSession(db, user.id);
    auth.setSessionCookie(ctx, token);

    ctx.body = { user };
  });

  router.post('/logout', async (ctx) => {
    const token = ctx.cookies.get(auth.SESSION_COOKIE);

    if (token) {
      auth.destroySession(db, token);
    }

    auth.clearSessionCookie(ctx);
    ctx.status = 204;
  });

  router.get('/me', requireAuth, async (ctx) => {
    ctx.body = { user: ctx.state.user };
  });


  router.get('/enrollments', requireAuth, async (ctx) => {
    // get the user id
    const userId = ctx.state.user.id;

    const courses = db.prepare('SELECT * FROM courses INNER JOIN enrollments on enrollments.course_id = courses.id WHERE enrollments.user_id = ?').all(userId);

    ctx.body = { courses: courses }
  });

  // Register for { "courseId" }
  router.post('/enrollments', requireAuth, async (ctx) => {
    const courseId = ctx.params.id;
    const userId = ctx.state.user.id;

    const course = db.prepare('INSERT INTO enrollments (course_id, user_id) VALUES (?,?)').get(courseId, userId);

  });

  // Drop the { "courseId" }
  router.delete('/enrollments/:id', requireAuth, async (ctx) => {
    const courseId = ctx.params.id;
    const userId = ctx.state.user.id;

    const course = db.prepare('DELETE * FROM enrollments WHERE course_id = ? AND ').get(courseId, userId);

    // handle errors and staff
  });


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
