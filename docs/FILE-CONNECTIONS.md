# How the files connect

UCRS uses the Express Generator layout. Node runs the server entry point, Express routes requests, EJS renders pages, and Mongoose reads and writes the registration records in MongoDB. Start in the repository root after installing the npm dependencies. [Setup instructions](../README.md#set-up-a-fresh-clone)

## From npm start to the first request

1. npm runs `prestart` to copy packaged browser libraries into `public/vendor/`. The `start` script then runs `node ./bin/www`. [package.json](../package.json)
2. `bin/www` imports the app factory and database connector. Importing the app loads `.env`. The entry point waits for the database connection, checks that the deployment supports transactions, and initializes registered model indexes. [bin/www](../bin/www) · [Database connection](../config/db.js)
3. `createApp()` configures EJS, security headers, request logging, body parsing, static files, and MongoDB-backed browser sessions. It mounts the live router at `/` followed by the 404 and error handlers. The entry point then listens on `PORT`, defaulting to 8080. [app.js](../app.js)
4. The root router assigns each API a prefix. For example, mounting `section.routes.js` at `/api/sections` turns its `GET /:id/roster` into `GET /api/sections/:id/roster`. The page router handles paths such as `/faculty/sections/:id/roster` and returns HTML. [Router mounts](../routes/index.js)

## Where to look

| Directory | Responsibility |
| --- | --- |
| [routes/](../routes/) | HTTP methods, paths, and role checks. Resource routers define JSON API endpoints. `views.routes.js` maps browser pages and forms. `session.routes.js` handles browser sign-in and sign-out. |
| [controllers/](../controllers/) | Translate a request into service calls and choose a JSON response, an EJS page, or a redirect. `portal.controller.js` serves the live workspaces. |
| [services/](../services/) | Implement registration, waitlist promotion, grade submission, reports, and account changes. The portal and API share these rules. |
| [models/](../models/) | Define MongoDB documents, references, validation, and indexes through Mongoose. A section references a course and faculty user and embeds its meetings. An enrollment references the student, course, and section and stores the term, status, and grade. |
| [middleware/](../middleware/) and [validators/](../validators/) | Check sessions, JWTs, roles, form origins, and request fields. Central error handling returns the response format expected by the caller. |
| [views/](../views/) | EJS templates run on the server. Shared partials provide navigation, forms, and common layouts. |
| [public/](../public/) | Client-side files delivered to the browser. For example, Express serves `public/stylesheets/portal.css` at `/stylesheets/portal.css`. Browser scripts handle form feedback, appearance settings, and the Chart.js report. |
| [config/](../config/) and [utils/](../utils/) | Database and academic settings, token signing, time conversion, GPA calculation, and response helpers. |
| [scripts/](../scripts/) and [fixtures/](../fixtures/) | Admin seeding, browser asset preparation, automated checks, and the sample records for the preview. |

## Example · Register for a section

Suppose a section of CS101 has one seat left. A student opens the course in the catalog and selects **Enroll**.

1. The course template submits `POST /student/enrollments/:id/register` with the section ID in the URL. The page router loads the user from the session, checks the Student role and request origin, and validates the ID. [Course detail template](../views/catalog/show.ejs) · [Page routes](../routes/views.routes.js)
2. The portal controller passes the signed-in student's ID and the section ID to `enrollmentService.register()`. The service checks the term, section status, prerequisites, duplicate registrations, credit load, and schedule. It also considers eligible students already waiting. [Portal controller](../controllers/portal.controller.js) · [Enrollment service](../services/enrollment.service.js)
3. With no earlier eligible student waiting, the service creates an `enrolled` record and increments the section's seat count in one transaction. If another eligible student claims the last seat first, the next registration becomes `waitlisted`. A drop or capacity increase on an open section can promote the next eligible student. [Enrollment model](../models/Enrollment.js) · [Section service](../services/section.service.js)
4. On success, a native form submission receives a 303 redirect. For an enhanced form, the browser sends `X-Portal-Form: 1`, receives the destination as JSON, and navigates there. Both paths open **My enrollments** with the saved status. [Browser form script](../public/javascripts/portal.js) · [Enrollments template](../views/student/enrollments.ejs)

An API client can perform step 1 by sending `POST /api/enrollments` with a bearer token and a JSON `section` ID. The API router verifies the token and Student role. Its controller calls the same service and returns the registration under `data` with HTTP 201. [Enrollment API router](../routes/enrollment.routes.js) · [Enrollment API controller](../controllers/enrollment.controller.js)

## Reading the result

When the student opens `/student/schedule`, the controller loads the student's enrolled and waitlisted records for the current term. Mongoose populates the course, section, and faculty references. The service turns section meetings into timetable entries. Express passes these to the EJS template, which labels pending seats. [Schedule template](../views/student/schedule.ejs)

An administrator opening `/admin/reports` sees the other side of the same registration. The report service reads non-cancelled sections and groups waitlisted records by section. The template sends totals and an HTML table to the browser. Chart.js reads the table to plot seats taken and remaining against a separate waitlist bar. The same service provides JSON to `GET /api/reports`. [Report service](../services/report.service.js) · [Report template](../views/admin/reports.ejs) · [Browser chart](../public/javascripts/reports.js)

## How a photo reaches the browser

The profile and course forms send multipart data. After the session, role, and origin checks, Multer reads one file. Sharp decodes it, resizes it, and produces a WebP image without the original metadata. The application saves the image and its version on the same MongoDB record as the form changes. A failed save keeps the previous image. [Upload middleware](../middleware/imageUpload.js) · [Image processing](../services/image.service.js)

Ordinary queries omit the image bytes. Catalog pages request a course cover at `GET /catalog/courses/:id/image`. The account menu requests the signed-in user's own photo at `GET /account/photo`. Records without uploads use the department image or the user's initials. [Page routes](../routes/views.routes.js)

The preview starts separately with `npm run dev:views`. Its entry point calls `createApp({ preview: true })` and mounts a fixture-backed router to render the same templates. Use the live server for persistent registration, sign-in, or API requests. [Preview entry point](../scripts/preview-views.js) · [Preview router](../routes/preview.routes.js)
