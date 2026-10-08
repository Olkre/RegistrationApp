# Course Registration App

Students log in and manage their own schedule from a list of offered courses.

- **Client:** React (Vite, function components and hooks, React Router), no UI library
- **Server:** Node.js, Koa, hand-written SQL through `better-sqlite3`
- **Database:** SQLite, defined in [`server/schema.sql`](server/schema.sql)

## Setup

Requires Node.js 20 or newer.

```sh
npm install
npm run seed   # creates server/data/registration.db with the demo data
npm run dev    # API on http://localhost:3001, app on http://localhost:5173
```

Open <http://localhost:5173>. `npm run seed` can be run again at any time to
reset the database. `npm test` runs the Jest tests.

## Demo accounts

There is no sign-up; every account comes from the seed script. All passwords
are `password123`.

| Email | Student | Starts with |
| --- | --- | --- |
| `alice@example.com` | Alice Nguyen | Completed Intro to Programming and Data Structures; enrolled in Calculus I |
| `bob@example.com` | Bob Martinez | Completed Intro to Programming |
| `carol@example.com`, `dave@example.com` | Seat fillers | Enrolled in Intro to Philosophy and Technical Writing |

### Trying each rule

| Rule | Log in as | Register for | Why it is refused |
| --- | --- | --- | --- |
| Already enrolled / completed | Alice | — | The panel shows Drop or "completed" instead of Register; the API also refuses (see tests) |
| Prerequisites, none completed | Bob | Algorithms | Data Structures is not completed |
| Prerequisites, some completed | Bob | Databases | Intro to Programming is completed, Data Structures is not |
| Prerequisite in progress | Alice | Calculus II | Calculus I is enrolled, not completed |
| Time conflict | Alice | Linear Algebra | Calculus I is also Wednesday 09:00 |
| Capacity | either | Intro to Philosophy | Both seats are taken |
| Last seat | Alice, then Bob | Technical Writing | One seat left: the first student gets it, the second is refused |

Dropping frees the seat: after Alice drops Technical Writing, Bob can take it.

## API routes

All routes are under `/api` and exchange JSON. Only `POST /api/login` works
without a session.

| Method | Route | Purpose | Success |
| --- | --- | --- | --- |
| POST | `/api/login` | Log in with `{ "email", "password" }`; sets the session cookie | 200 `{ user }` |
| POST | `/api/logout` | Delete the session on the server and clear the cookie | 204 |
| GET | `/api/me` | The logged-in student | 200 `{ user }` |
| GET | `/api/courses` | Every course, ids and titles only | 200 `{ courses: [{ id, title }] }` |
| GET | `/api/courses/:id` | One course: description, day, time, capacity, seats left, prerequisites, the student's own status | 200 `{ course }` |
| GET | `/api/enrollments` | The student's enrolled courses, ordered by day and time | 200 `{ courses }` |
| POST | `/api/enrollments` | Register for `{ "courseId" }` | 201 `{ enrollment }` |
| DELETE | `/api/enrollments/:courseId` | Drop a course | 204 |

The enrollment routes take no user id: they always act on the student who owns
the session, so a student can only see and change their own registration.

### Errors

Every error has the same shape:

```json
{ "error": { "code": "TIME_CONFLICT", "message": "Linear Algebra meets at the same time as Calculus I (Wednesday at 09:00). Drop Calculus I first." } }
```

| Status | Codes |
| --- | --- |
| 400 | `INVALID_JSON`, `INVALID_BODY`, `INVALID_INPUT`, `INVALID_COURSE_ID` |
| 401 | `UNAUTHENTICATED` |
| 404 | `COURSE_NOT_FOUND`, `NOT_ENROLLED`, `NOT_FOUND` (unknown route) |
| 409 | `ALREADY_ENROLLED`, `ALREADY_COMPLETED`, `MISSING_PREREQUISITE`, `TIME_CONFLICT`, `COURSE_FULL` |
| 500 | `INTERNAL_ERROR` (details are logged on the server only) |

## How does the API stop two students from taking the last seat at the same time?

Registration runs in a single `BEGIN IMMEDIATE` transaction
([`server/registration.js`](server/registration.js)): the rule checks, the
count of enrolled students and the `INSERT` all happen inside it. An immediate
transaction takes SQLite's write lock before its first read, and SQLite allows
only one writer at a time, so a second registration cannot count the seats
until the first has committed its row; it then sees the course is full and is
refused with `COURSE_FULL`. Within one Node process the guarantee is even
simpler, because `better-sqlite3` is synchronous: the whole transaction runs
without yielding to the event loop, so two requests can never interleave
between the count and the insert. If any check fails the transaction rolls back
and nothing changes. The primary key on `(user_id, course_id)` is a final guard
against a duplicate row for the same student.

## Project layout

```
server/
  schema.sql        tables, keys and constraints
  db.js             opens a database and applies schema.sql
  seed.js           demo courses and students
  registration.js   registration rules (no server needed to call it)
  auth.js           bcrypt login, server-side sessions, requireAuth middleware
  validation.js     request body and parameter checks
  errors.js         AppError and the JSON error middleware
  app.js            Koa routes
  index.js          starts the server
  __tests__/        Jest tests against an in-memory database
client/
  src/api.js        fetch wrapper that turns every failure into a readable error
  src/auth.jsx      shared authentication state
  src/pages/        login and registration screens
  src/components/   course list, details panel, schedule
```

## Notes

- Passwords are stored as bcrypt hashes (`bcryptjs`), including the seeded ones.
- The session id lives in an `httpOnly`, `SameSite=Lax` cookie that lasts seven
  days. The server stores only a SHA-256 hash of it, in the `sessions` table.
- `ErrorBoundary` is the one class component, because React has no hook
  equivalent; it keeps a rendering bug from leaving a blank screen.

## Stretch goals

None completed.
