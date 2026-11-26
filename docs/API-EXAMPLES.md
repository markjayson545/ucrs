# API request examples

Start the live server and use its base URL in your HTTP client. The default base URL is `http://localhost:8080`. Use a test database for the write examples and substitute your configured term for `2026-1`. [Live setup](../README.md#run-the-live-system) · [Endpoint and role index](../README.md#api-quick-reference)

Replace angle-bracket placeholders with IDs and tokens from earlier responses. Check the HTTP status and read successful JSON payloads from `data`. A course list also includes pagination in `meta`. A successful delete returns HTTP 204 with an empty body. Errors include a `message` and may include field-level `errors`.

## Register and sign in

New registrations receive the Student role. Seed the administrator during setup. Register a second account and use **People and access** as the administrator to give it the Faculty role before testing staff operations.

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jordan Lee",
  "email": "jordan@example.edu",
  "password": "SamplePassphrase123!",
  "department": "Computer Science"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "jordan@example.edu",
  "password": "SamplePassphrase123!"
}
```

Copy `data.token` into the Authorization header on protected requests. Sign in with the role specified for each example.

## Create a course and section as an administrator

```http
POST /api/courses
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "code": "CS101",
  "title": "Introduction to Computing",
  "credits": 3,
  "department": "Computer Science",
  "prerequisites": []
}
```

Use the course ID from `data._id`. Get the faculty ID from `data.user._id` in `GET /api/auth/me` using a faculty token. Section times are minutes after midnight. Here the class meets Monday from 09:00 to 10:30.

```http
POST /api/sections
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "course": "<course-id>",
  "faculty": "<faculty-id>",
  "term": "2026-1",
  "sectionCode": "A1",
  "capacity": 25,
  "status": "open",
  "schedule": [{ "day": "MON", "start": 540, "end": 630, "room": "Lab 1" }]
}
```

Use `GET /api/courses?q=computing&page=1&limit=10` to search. The course list also accepts `department` and sorts by `code`, `title`, `department`, or `credits` through the `sort` parameter. Use `GET /api/sections?term=2026-1&course=<course-id>` to find the offering. Send a bearer token for both requests.

## Register for a section as a student

```http
POST /api/enrollments
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "section": "<section-id>"
}
```

HTTP 201 returns an enrollment ID and an `enrolled` or `waitlisted` status. A conflict with prerequisites, schedule, or registration rules returns HTTP 409. View your timetable with `GET /api/enrollments/schedule`. To drop or leave the waitlist, send `DELETE /api/enrollments/<enrollment-id>`.

## Grade an enrolled student as the assigned faculty member

Keep the student enrolled for the grading example. Find the enrollment ID in `data.records` from `GET /api/sections/<section-id>/roster`.

```http
PATCH /api/sections/<section-id>/grades
Authorization: Bearer <faculty-token>
Content-Type: application/json

{
  "grade": { "<enrollment-id>": "A" }
}
```

The student can now read the grade and credit-weighted GPA with `GET /api/enrollments/transcript`.

## Read enrollment and waitlist totals as an administrator

```http
GET /api/reports?term=2026-1
Authorization: Bearer <admin-token>
```

Omit `term` to use the current term. Under `data`, the response includes `sections`, `capacity`, `enrolled`, `available`, `waitlisted`, `utilization` (rounded percent), and `openSections`. Cancelled sections are excluded. Each section row includes its `enrolledCount`, `capacity`, and `waitlisted`. A student registered in two sections accounts for two seats. The browser report uses the same totals. [Report service](../services/report.service.js)
