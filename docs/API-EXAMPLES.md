# API request examples

Use a running [live portal](../README.md#run-the-live-system). These examples use `http://localhost:8080` and the default term `2026-1`. Use a test database when running the write examples.

Paste each request into an HTTP client. Replace values in angle brackets with IDs or tokens from your responses. Successful requests with a JSON body return `{ "success": true, "data": ... }`. HTTP 204 has an empty body.

## Register and sign in

New registrations receive the Student role. Create an administrator with `npm run seed` and assign Faculty in **People and access** before testing staff operations.

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

Use the course ID from `data._id`. Get the faculty ID from `GET /api/auth/me` using a faculty token. Section times are minutes after midnight. Here the class meets Monday from 09:00 to 10:30.

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

Use `GET /api/courses?q=computing&page=1&limit=10` to search and `GET /api/sections?term=2026-1` to find sections. Send a bearer token for both requests.

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

Find the enrollment ID with `GET /api/sections/<section-id>/roster`.

```http
PATCH /api/sections/<section-id>/grades
Authorization: Bearer <faculty-token>
Content-Type: application/json

{
  "grade": { "<enrollment-id>": "A" }
}
```

The student can now read the grade with `GET /api/enrollments/transcript`. An administrator can read enrollment and waitlist totals with `GET /api/reports?term=2026-1`.
