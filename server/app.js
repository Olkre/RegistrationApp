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
    const courseId = Number(ctx.request.body?.courseId);
    const userId = ctx.state.user.id;

    console.log('enrolling in ' + courseId)


    // check if already enrolled
    const existingEnrollment = db.prepare('SELECT * FROM enrollments WHERE course_id = ? AND user_id = ?').get(courseId, userId);
    if (existingEnrollment) {
      throw badRequest('ALREADY_ENROLLED', 'You are already enrolled in this course.');
    }

    // check prerequisites
    // gets prereq - use pluck() to return an array
    const prereqs = db.prepare('SELECT prerequisite_id FROM prerequisites WHERE course_id = ?').pluck().all(courseId)
    console.log("prereqs")
    console.log(prereqs)
    if (prereqs) {
      // get completed
      const completed = db.prepare('SELECT course_id FROM enrollments WHERE user_id = ? AND status = ?').pluck().all(userId, 'completed');
      // compare the two
      console.log("completed")
      console.log(completed)
    }


    // check conflicts with other courses
    // check for open seats

    db.prepare(
      "INSERT INTO enrollments (course_id, user_id, status) VALUES (?, ?, 'enrolled')"
    ).run(courseId, userId);

    ctx.body = { enrollment: { courseId, userId, status: 'enrolled' } };
  });



  // Drop the { "courseId" }
  router.delete('/enrollments/:id', requireAuth, async (ctx) => {
    const courseId = ctx.params.id;
    console.log("dropping " + courseId)

    const userId = ctx.state.user.id;

    const result = db
      .prepare('DELETE FROM enrollments WHERE course_id = ? AND user_id = ?')
      .run(courseId, userId);

    if (result.changes === 0) {
      ctx.status = 404;
      ctx.body = { error: { code: 'NOT_ENROLLED', message: 'Course is not in your schedule.' } };
      return;
    }

    ctx.status = 204;

  });


  router.get('/courses', requireAuth, async (ctx) => {
    const courses = db.prepare('SELECT * FROM courses').all();
    ctx.body = { courses };
  });

  router.get('/course/:id', requireAuth, async (ctx) => {
    const id = ctx.params.id;
    const userId = ctx.state.user.id;

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
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
