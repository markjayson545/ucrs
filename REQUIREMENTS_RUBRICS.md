# University Course Registration System

Project 3 in the Express.js and MongoDB final project brief.

Students browse courses, register for classes, and view their schedules. Faculty and administrators manage course offerings.

## Core requirements

| Feature | Required behavior |
| --- | --- |
| Roles and authentication | Support Student, Faculty, and Admin roles with JWT authentication. |
| Courses and sections | Manage courses, credits, prerequisites, section capacity, and schedules. |
| Registration and drop | Let students register and drop classes. Check seat capacity and prerequisites. |
| Student views | Show a personal timetable and registered courses. |
| Grades and transcripts | Let faculty submit grades and students view their transcripts. |
| Admin reports | Report enrollment statistics and waitlists. |

## Evaluation rubric

The rubric allocates **100 points** across functionality and engineering practices.

| # | Criterion | Points | What is evaluated |
| --- | --- | ---: | --- |
| 1 | Core Functionality & Features | 35 | All major features work correctly, including CRUD, business rules, status flows, and searches or filters. |
| 2 | Database Design (MongoDB / Mongoose) | 15 | Well-structured schemas, sensible reference or embedded relationships, useful indexes, and validation. |
| 3 | Authentication & Authorization | 12 | Secure registration and sign-in with JWT or sessions, password hashing, and role-based route protection. |
| 4 | API Design & Code Quality | 15 | RESTful routes, consistent JSON responses, appropriate HTTP status codes, modular files, and readable code. |
| 5 | Error Handling, Validation & Security | 10 | Input validation, centralized errors, basic sanitization, rate-limit awareness, and protection of sensitive data. |
| 6 | Documentation & Testing | 8 | A README covering setup, environment variables, startup, and the API, plus sample requests and basic manual or automated tests. |
| 7 | Extra / Polish | 5 | Bonus features, pagination, filtering or sorting, file uploads, logging, deployment readiness, or strong code organization. |
| | **Total** | **100** | |

## Recommended technical requirements

- Node.js and Express.js with clear `routes`, `controllers`, `models`, `middleware`, and `utils` folders.
- MongoDB with Mongoose ODM.
- Environment-based configuration with `dotenv`.
- JWT authentication or an equivalent secure session approach.
- Request validation and consistent JSON responses, including errors from async operations.
- README with installation, startup, and API documentation.
- Postman documentation is optional and encouraged.

## Evidence for the evaluation

| Criterion | Where to review or demonstrate it |
| --- | --- |
| Core functionality | Run `npm run check:system` against a test replica set. The check exercises course and section management, registration rules, simultaneous requests for the last seat, waitlist promotion, grading, transcripts, and reports. Match the browser workflows to the [page map](docs/CONNECTING-VIEWS.md). |
| Database design | Review the schemas and indexes in [models](models/) and the transaction boundaries in [services](services/). |
| Roles and security | Review the JWT and browser session middleware, then verify protected routes and account changes with `npm run check:system`. |
| API design and validation | Start with [the API overview](README.md#api-quick-reference) and run [the sample requests](docs/API-EXAMPLES.md). Follow individual routes through [the file walkthrough](docs/FILE-CONNECTIONS.md). |
| Documentation and testing | Use [the README](README.md) for setup. Run `npm run check:views` for EJS routes and assets, then `npm run check:system` with MongoDB. |
| Admin reports and polish | Compare term totals with the section chart and table at `/admin/reports`. Try a course cover as an administrator or a private profile photo in account settings. The system check covers upload validation, replacement, removal, and access controls. [Image workflows](docs/CONNECTING-VIEWS.md#course-images-and-profile-photos) |
