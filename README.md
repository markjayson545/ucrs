# University Course Registration System

UCRS helps students find a course, enroll in a section, and follow their timetable and grades. Faculty grade their assigned sections. Administrators maintain the catalog, assign faculty, and compare seat usage and waitlists across sections.

## Set up a fresh clone

Use Node.js 26 (the version in the Dockerfile) and npm. The live app also needs MongoDB with replica-set transactions. The Compose configuration provides a single-node replica set for local use.

```sh
git clone https://github.com/markjayson545/ucrs.git
cd ucrs
npm install
```

Copy `.env.example` to `.env` with `cp .env.example .env` or `Copy-Item .env.example .env` in PowerShell. Edit the settings before starting the live app. If PowerShell blocks `npm.ps1`, use `npm.cmd` for the npm commands.

| Setting | How to set it |
| --- | --- |
| `SESSION_SECRET`, `JWT_SECRET` | Generate two separate signing secrets. Run `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` once for each. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Choose the initial administrator's credentials. The seed command requires a password of at least 8 characters and at most 72 UTF-8 bytes for a new account. |
| `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_URI` | Set the database credentials and use matching, URL-encoded credentials in the URI. Compose uses the hostname `mongodb` and replica set `ucrs`. Keep the original database credentials when reusing the existing `data/` directory. |
| `PORT`, `APP_ORIGIN` | The example listens on `8080`. Set the origin to the exact browser address, including scheme and port, for protected form submissions. |
| `COMPASS_PORT`, `COMPASS_AUTH_USERNAME`, `COMPASS_AUTH_PASSWORD` | Optional Compass Web settings. The browser UI listens on `8001` and uses the basic-auth account `admin` / `secret` until you set your own credentials. |
| `CURRENT_TERM`, `JWT_EXPIRES_IN` | The defaults are `2026-1` for registration and `1d` for API tokens. |
| `NODE_ENV`, `TRUST_PROXY` | Use `development` for local HTTP. Production session cookies require HTTPS. Use `TRUST_PROXY=1` behind one trusted reverse proxy. |

## Run the live system

With Docker Compose installed, run these commands from the project root.

```sh
docker compose up -d --build ucrs
docker compose exec ucrs npm run seed
```

Compose waits for MongoDB to become writable before starting the portal. The seed command creates the administrator. Open the portal at the configured origin and sign in with that account. New registrations receive the Student role. To create a teaching account, register it and have the administrator assign the Faculty role under **People and access**. [Open the local portal](http://localhost:8080)

### Browse the database with Compass Web

The Compose file also defines a `compass` service running [MongoDB Compass Web](https://github.com/haohanyang/compass-web). It waits for MongoDB to be writable and connects with the same root credentials as the app. Start the whole stack, not just `ucrs`, to include it.

```sh
docker compose up -d
```

Open [http://localhost:8001](http://localhost:8001) and sign in with the basic-auth account `admin` / `secret`. The service binds to `127.0.0.1` only and maps host port `8001` to the container's port `8080`. Set `COMPASS_AUTH_USERNAME` and `COMPASS_AUTH_PASSWORD` in `.env` before exposing it, and set `COMPASS_PORT` to use a different host port. The connection is fixed to the Compose replica set; editing extra connections and the Mongo shell are enabled in the UI.

### Run Node on the host

1. Start the database with `docker compose up -d mongodb`, or supply your own MongoDB replica set.
2. For the Compose database, set `MONGO_URI` in the host's `.env` to `mongodb://<user>:<password>@127.0.0.1:27017/ucrs?authSource=admin&replicaSet=ucrs&directConnection=true`. Use the mapped port if you changed `MONGO_PORT`. Restore the container hostname when switching back to running the app in Compose.
3. Run `npm run seed`, then `npm start`. Use `npm run dev` to restart Node automatically on file changes.

## How the system works

The project began with Express Generator. After npm prepares the browser assets, `npm start` runs `bin/www`. That entry point connects to MongoDB, creates the Express app from `app.js`, and starts the HTTP listener.

API endpoints live in `routes/`. The router checks the caller and dispatches to a controller. Services apply registration rules and read or write Mongoose models. For the portal, Express renders HTML from `views/`. The browser loads its CSS, JavaScript, images, and packaged libraries from `public/`. For example, both the catalog's **Enroll** form and `POST /api/enrollments` call the same service to assign a seat or a waitlist place. [Follow a registration through the files](docs/FILE-CONNECTIONS.md)

## API quick reference

Sign in with `POST /api/auth/login` and send the returned `data.token` as `Authorization: Bearer <token>`. The browser signs in at `POST /auth/session` and uses a session cookie.

| Access | Endpoints |
| --- | --- |
| Public | `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login` |
| Signed-in user | `GET /api/auth/me`, `GET /api/courses`, `GET /api/courses/:id`, `GET /api/sections`, `GET /api/sections/:id` |
| Student | `GET /api/enrollments`, `GET /api/enrollments/schedule`, `GET /api/enrollments/transcript`, `POST /api/enrollments`, `DELETE /api/enrollments/:id` |
| Assigned faculty | `GET /api/sections/:id/roster`, `PATCH /api/sections/:id/grades` |
| Administrator | `POST /api/courses`, `POST /api/sections`, `PATCH` or `DELETE` on `/api/courses/:id` and `/api/sections/:id`, `GET /api/reports?term=2026-1` |

The auth and course JSON routers also accept their original `/auth` and `/courses` prefixes. [Try the API examples](docs/API-EXAMPLES.md)

## Preview and checks

- Run `npm run dev:views` to explore the portal with sample records. The preview uses port `8081` by default and accepts `VIEWS_PORT` to change it. [Open the preview](http://127.0.0.1:8081)
- Run `npm run check:views` to render the linked preview pages and check filters, error pages, and browser assets.
- Run `npm run check:system` with `UCRS_TEST_MONGO_URI` set in the shell to a test replica-set URI. The script creates and removes its own `ucrs_test_…` database. With the local Compose setup, use `docker compose exec ucrs sh -c 'UCRS_TEST_MONGO_URI=$MONGO_URI npm run check:system'`.

## Documentation

- Trace startup, browser forms, API endpoints, and database writes. [How the files connect](docs/FILE-CONNECTIONS.md)
- Find each portal page, its template, and the registration rules for each role. [Browser routes and workspaces](docs/CONNECTING-VIEWS.md)
- Follow sample requests from sign-in through enrollment, grading, and reporting. [API request examples](docs/API-EXAMPLES.md)
- Match the required features and engineering criteria to code and checks. [Requirements and evaluation rubric](REQUIREMENTS_RUBRICS.md)
