const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const { AppError, errorHandler, badRequest, unauthenticated } = require('./errors');
const auth = require('./auth');
const registration = require('./registration');
const { requireObjectBody, requireString, requireCourseId } = require('./validation');

const cors = require('@koa/cors');

function createApp(db) {
  const app = new Koa();
  const router = new Router({ prefix: '/api' });
  const requireAuth = auth.requireAuth(db);

  // auth routes
  // POST  /api/login   Log in with { "email", "password" }; sets the session cookie | 200 { user }
  router.post('/login', async (ctx) => {
    const body = requireObjectBody(ctx.request.body);

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

    const courses = db
      .prepare(` SELECT courses.id, courses.title, courses.start_time, courses.day_of_week
        FROM courses
        INNER JOIN enrollments ON enrollments.course_id = courses.id
        WHERE enrollments.user_id = ? AND enrollments.status = ?
        ORDER BY courses.day_of_week, courses.start_time
      `)
      .all(userId, 'enrolled');

    ctx.status = 201;
    ctx.body = { courses };
  });

  // Register for { "courseId" }
  router.post('/enrollments', requireAuth, async (ctx) => {
    requireCourseId(ctx.request.body?.courseId);

    const courseId = Number(ctx.request.body?.courseId);
    const userId = ctx.state.user.id;

    console.log('enrolling in ' + courseId);

    registration.register(db, userId, courseId);


    ctx.body = { enrollment: { courseId, userId, status: 'enrolled' } };
  });


  // Drop the { "courseId" }
  router.delete('/enrollments/:id', requireAuth, async (ctx) => {

    const courseId = requireCourseId(ctx.params.id);

    console.log("dropping " + courseId)

    const userId = ctx.state.user.id;

    registration.drop(db, userId, courseId);

    ctx.status = 204;

  });


  router.get('/courses', requireAuth, async (ctx) => {
    const courses = db.prepare('SELECT id, title FROM courses').all();
    ctx.body = { courses };
  });

  // show course details
  router.get('/courses/:id', requireAuth, async (ctx) => {

    const id = requireCourseId(ctx.params.id);
    const userId = ctx.state.user.id;

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);

    if(!course) {
       if (result.changes === 0) {
        throw new AppError(
          500,
          'COURSE_NOT_FOUND',
          'Course is not found in the database.'
        );
      }
    }

    console.log("course called")
    console.log(course)

    // load empty seats
    course.takenSeats = db
      .prepare('SELECT Count(*) FROM enrollments WHERE course_id = ? AND status = ?')
      .pluck()
      .get(id, 'enrolled');
    // current user status
    const currentEnrollment = db.prepare('SELECT status FROM enrollments WHERE course_id = ? AND user_id = ?').get(id, userId);

    if (currentEnrollment) {
      course.currentEnrollment = currentEnrollment;
    }

    // prereqs
    course.prerequisites = db
      .prepare(`
          SELECT courses.title FROM prerequisites
          JOIN courses ON courses.id = prerequisites.prerequisite_id
          WHERE prerequisites.course_id = ?
      `)
      .pluck()
      .all(id);


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
