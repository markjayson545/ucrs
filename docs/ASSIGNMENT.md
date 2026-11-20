# University Course Registration System

> Earlier build notes. Use [Requirements and evaluation](../REQUIREMENTS_RUBRICS.md) as the grading reference and [the README](../README.md) for setup.

---

## 1. Project Description

A system for students to browse courses, register for classes and view schedules, and for faculty and admins to manage course offerings.

## 2. Core Features

- [ ] **Roles and auth:** Student, Faculty and Admin roles, with JWT authentication
- [ ] **Course and section management:** credits, capacity, prerequisites, schedule
- [ ] **Registration and drop:** capacity checks and prerequisite validation
- [ ] **Student views:** personal timetable and registered courses
- [ ] **Grades:** grade submission by faculty; transcript view for students
- [ ] **Admin reports:** enrollment statistics and waitlists

## 3. Evaluation Rubric (Total: 100 Points)

Points reward both functional completeness and professional engineering practices.

| # | Criteria | Points | Description |
|---|----------|:------:|-------------|
| 1 | Core Functionality & Features | 35 | All major features of the chosen system are implemented and work correctly (CRUD, business rules, status flows, searches/filters). |
| 2 | Database Design (MongoDB / Mongoose) | 15 | Well-structured schemas, proper relationships (refs / embedding), indexes where useful, validation, and sensible data modeling. |
| 3 | Authentication & Authorization | 12 | Secure user registration/login (JWT or sessions), password hashing, role-based access control protecting appropriate routes. |
| 4 | API Design & Code Quality | 15 | RESTful routes, consistent response format, proper HTTP status codes, modular structure (routes / controllers / models / middleware), clean readable code. |
| 5 | Error Handling, Validation & Security | 10 | Input validation, centralized error handling, protection against common issues (e.g. basic sanitization, rate-limit awareness, no sensitive data leaks). |
| 6 | Documentation & Testing | 8 | Clear README (setup, env vars, how to run, API overview), sample requests (Postman collection or similar), and at least basic manual or automated tests. |
| 7 | Extra / Polish | 5 | Bonus features, pagination, filtering/sorting, file upload handling, logging, deployment readiness, or outstanding code organization. |
| | **TOTAL** | **100** | |

## 4. Recommended Technical Requirements (Common to All Projects)

- Node.js + Express.js with a clear folder structure (`routes`, `controllers`, `models`, `middleware`, `utils`)
- MongoDB with Mongoose ODM
- Environment variables for configuration (`dotenv`)
- JWT-based authentication (or an equivalent secure session approach)
- Request validation (e.g. `express-validator`)
- Proper async error handling and consistent JSON responses
- README with installation, running instructions, and API documentation overview
- *(Optional but encouraged)* Postman docs

## 5. Build Constraints (self-imposed)

- Built manually, without AI assistance, for this project only
- Reference sources: official documentation only (MDN, expressjs.com, mongoosejs.com, mongodb.com/docs, package READMEs)

## 6. Quick Reference

### Where each rubric item is earned

| Rubric item | Build plan phase(s) |
|-------------|---------------------|
| 1. Core functionality | 5, 6, 7, 8 |
| 2. Database design | 2 |
| 3. Auth & authorization | 3 |
| 4. API design & code quality | 1, 4, all phases |
| 5. Errors, validation, security | 4, 9 |
| 6. Documentation & testing | 10 |
| 7. Extra / polish | 11 |

### Build phases

0. JavaScript refresher
1. Project skeleton
2. Data models (Mongoose)
3. Authentication and authorization
4. Validation and error handling
5. Courses and sections (CRUD)
6. Registration and drop (core business rules)
7. Timetable, grades and transcript
8. Admin reports
9. Security hardening
10. Testing and documentation
11. Polish and deployment readiness

See `Course_Registration_System_Build_Plan.docx` for the detailed steps, checkpoints and schedule.

## 7. Design Decisions Log

Record each decision here (or in `DEVLOG.md`) as you make it, so it can go into the final README.

| Decision | Choice | Reason |
|----------|--------|--------|
| Language (JS or TS) | | |
| Module system (CommonJS or ES modules) | | |
| Response envelope | | |
| Waitlist behaviour (waitlist or reject when full) | | |
| Passing grade for prerequisites | | |
| Re-enrolment after drop (reuse or new document) | | |
| Waitlist promotion re-checks conflicts? | | |
| Maximum credit load per term | | |
| Delete behaviour (block or soft delete) | | |
| Grade submission moves enrollment to `completed`? | | |
