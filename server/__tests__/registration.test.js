const { openDatabase } = require('../db');
const { register, drop } = require('../registration');
const { requireAuth } = require('../auth');

const MON = 1, TUE = 2;

let db;
let student;
let other;

function addUser(name) {
  return db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, `${name}@example.com`, 'not-used').lastInsertRowid;
}

function addCourse(title, { day = MON, start = '09:00', capacity = 10, prerequisites = [] } = {}) {
  const id = db
    .prepare(
      'INSERT INTO courses (title, description, day_of_week, start_time, capacity) VALUES (?, ?, ?, ?, ?)'
    )
    .run(title, `${title} description`, day, start, capacity).lastInsertRowid;
  for (const prerequisiteId of prerequisites) {
    db.prepare('INSERT INTO prerequisites (course_id, prerequisite_id) VALUES (?, ?)').run(
      id,
      prerequisiteId
    );
  }
  return id;
}

function addEnrollment(userId, courseId, status) {
  db.prepare('INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)').run(
    userId,
    courseId,
    status
  );
}

const enrollmentCount = () => db.prepare('SELECT COUNT(*) AS n FROM enrollments').get().n;

const statusOf = (userId, courseId) =>
  db.prepare('SELECT status FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId)
    ?.status;

// Asserts the registration is refused with the given error and adds no row.
function expectRefused(userId, courseId, { status, code }) {
  const before = enrollmentCount();
  let error;
  try {
    register(db, userId, courseId);
  } catch (err) {
    error = err;
  }
  expect(error).toBeDefined();
  expect(error.code).toBe(code);
  expect(error.status).toBe(status);
  expect(enrollmentCount()).toBe(before);
  return error;
}

beforeEach(() => {
  db = openDatabase(':memory:');
  student = addUser('student');
  other = addUser('other');
});

afterEach(() => {
  db.close();
});

describe('refused registrations', () => {
  test('not logged in: the auth middleware refuses a request with no session', async () => {
    addCourse('Algebra');
    const before = enrollmentCount();
    const ctx = { cookies: { get: () => undefined, set: jest.fn() }, state: {} };
    const next = jest.fn();

    await expect(requireAuth(db)(ctx, next)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
    expect(next).not.toHaveBeenCalled();
    expect(enrollmentCount()).toBe(before);
  });


  test('a course at the same time on a different day', () => {
    const algebra = addCourse('Algebra', { day: MON, start: '09:00' });
    const biology = addCourse('Biology', { day: TUE, start: '09:00' });
    register(db, student, algebra);

    register(db, student, biology);

    expect(statusOf(student, biology)).toBe('enrolled');
  });

});
