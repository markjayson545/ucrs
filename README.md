# University Course Registration System

UCRS is an Express and EJS portal backed by MongoDB. Students browse courses, register or join a waitlist, manage their schedule, and view grades. Faculty manage their assigned rosters and gradebooks. Administrators maintain the catalog, assign faculty, and review seat usage.

## Run the live system

1. Copy `.env.example` to `.env` if you are setting up a fresh copy. Set your own `SESSION_SECRET`, `JWT_SECRET`, and `ADMIN_PASSWORD`. Set `APP_ORIGIN` to the exact address you will open in the browser, including the port.
2. Run `docker compose up -d --build`. Compose starts the authenticated, single-node MongoDB replica set and waits until it can accept writes before starting the app.
3. Run `docker compose exec ucrs npm run seed` to create the initial administrator using the email and password in your environment.
4. Open [the live portal](http://localhost:8080). Create student accounts using the registration form. Sign in as the administrator and use **People and access** to assign an account the Faculty role before assigning that person to a section.

Compose uses `./data` for existing MongoDB files. Keep the same MongoDB credentials when reusing that directory. The app uses transactions for registration, seat changes, and grade submission, so a MongoDB replica set is required. See [Mongoose transactions](https://mongoosejs.com/docs/transactions.html) and [MongoDB replica set authentication](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/).

To run Node on the host, start MongoDB with `docker compose up -d mongodb`, install dependencies with `npm ci`, and use a host-accessible `MONGO_URI` for `npm run dev`. For the Compose database, replace the hostname in the example URI with `127.0.0.1`, use the mapped MongoDB port, and add `&directConnection=true`. The container service uses the hostname `mongodb` when it runs inside Compose.

In Windows PowerShell, use `npm.cmd` if your execution policy blocks `npm.ps1`.

| Setting | Purpose |
| --- | --- |
| `PORT`, `APP_ORIGIN` | HTTP port and exact browser origin for session and protected form submissions |
| `MONGO_URI` | MongoDB replica-set connection string |
| `SESSION_SECRET`, `JWT_SECRET` | Separate secrets for the session cookie signature and API bearer tokens |
| `CURRENT_TERM` | Registration term in `YYYY-N` format. Defaults to `2026-1`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credentials used by `npm run seed` to create the initial administrator |
| `NODE_ENV`, `TRUST_PROXY` | Production uses HTTPS cookies. Set `TRUST_PROXY=1` when the app is behind one trusted HTTPS proxy. |

## Explore the sample portal

Run `npm ci` and `npm run dev:views`, then open [the preview](http://127.0.0.1:8081). The preview loads sample records and lets you explore all three roles without MongoDB. Set `VIEWS_PORT` to use a different port.

The home page shows screenshots of the [student timetable](public/images/showcase/student-schedule.webp), [faculty gradebook](public/images/showcase/faculty-gradebook.webp), and [admin reports](public/images/showcase/admin-reports.webp).

## Account settings

Open your avatar menu in any workspace for the theme switch, accent settings, and sign-out. **Account settings** lets students, faculty, and administrators edit their own profile and password. Email changes require the current password. Changing the password keeps this browser signed in with a fresh session and invalidates previous sessions and JWTs.

## API quick reference

Get a JWT with `POST /api/auth/login` using `email` and `password`. Send it as `Authorization: Bearer <token>` on protected JSON routes. The browser portal signs in through `POST /auth/session` and uses a session cookie.

| Endpoint | What it does |
| --- | --- |
| `GET /api/health` | Check if HTTP is responding |
| `POST /api/auth/register`, `GET /api/auth/me` | Create a student account and read the current API identity |
| `GET /api/courses`, `GET /api/courses/:id` | List and read courses. List supports `q`, `department`, `page`, `limit`, and `sort`. |
| `POST /api/courses`, `PATCH /api/courses/:id`, `DELETE /api/courses/:id` | Manage courses as an administrator |
| `GET /api/sections`, `GET /api/sections/:id` | List and read sections. List supports `term` and `course`. |
| `POST /api/sections`, `PATCH /api/sections/:id`, `DELETE /api/sections/:id` | Manage sections as an administrator |
| `POST /api/enrollments`, `DELETE /api/enrollments/:id` | Register with a `section` ID or drop by enrollment ID as a student |
| `GET /api/enrollments`, `GET /api/enrollments/schedule`, `GET /api/enrollments/transcript` | Read your student records |
| `GET /api/sections/:id/roster`, `PATCH /api/sections/:id/grades` | Read and grade a section you teach. Send `{ "grade": { "<enrollmentId>": "A" } }` for grade submission. |
| `GET /api/reports?term=2026-1` | Read seat capacity, occupancy, and waitlists as an administrator |

The original `/auth/register`, `/auth/login`, `/auth/me`, and `/courses` JSON endpoints are available as aliases.

## Checks and file guides

- `npm run check:views` follows links through the preview and checks rendering, filters, error pages, and assets.
- Set `UCRS_TEST_MONGO_URI` to a test replica-set URI and run `npm run check:system`. The check creates and removes a temporary database named `ucrs_test_...` on that server.
- [How the files connect](docs/FILE-CONNECTIONS.md) walks through startup, a GET page, a POST form, an API request, and browser assets.
- [Connecting views](docs/CONNECTING-VIEWS.md) maps the browser URLs to EJS files.
- [Animations](docs/ANIMATIONS.md) explains how to reuse the existing motion patterns.
- [Design and usability review](docs/DESIGN.md) documents the themes, imagery, and interaction changes.
- [API request examples](docs/API-EXAMPLES.md) walks through setup, enrollment, grading, and reporting over HTTP.
- [Requirements and evaluation](REQUIREMENTS_RUBRICS.md) is the grading reference and maps each rubric criterion to evidence.
