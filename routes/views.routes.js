const router = require("express").Router();
const demo = require("../fixtures/view-demo");
const {
  loadPageUser,
  requirePageUser,
  allowPageRoles,
} = require('../middleware/view-auth');

// These are public UI previews, NOT protected dashboards. Add verified session
// authentication and role guards before replacing demo data with real records.
router.use((req, res, next) => {
  res.locals = {
    ...res.locals,
    ...demo,
    role: "student",
    currentPath: req.path,
    preview: true,
    formatTime: (minutes) =>
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
  };
  next();
});

// Activates the route guard
router.use(loadPageUser);
router.use(
  '/student',
  requirePageUser,
  allowPageRoles('student')
);

router.use(
  '/faculty',
  requirePageUser,
  allowPageRoles('faculty')
);

router.use(
  '/admin', 
  requirePageUser, 
  allowPageRoles('admin')
)

const page =
  (view, title, role = "student") =>
  (req, res) =>
    res.render(view, { title, role });
const missing = (res) =>
  res.status(404).render("shared/notFound", { title: "Page not found" });

router.get("/", page("index", "Your next chapter starts here"));
router.get("/auth/login", page("auth/login", "Welcome back"));
router.get("/auth/register", page("auth/register", "Create your account"));
router.get("/catalog/courses", (req, res) => {
  const q =
    typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const department =
    typeof req.query.department === "string" ? req.query.department : "";
  const filtered = demo.courses.filter(
    (c) =>
      (!department || c.department === department) &&
      `${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase()),
  );
  res.render("catalog/index", {
    title: "Find your next possibility",
    courses: filtered,
    q,
    department,
  });
});
router.get("/catalog/courses/:courseId", (req, res) => {
  const course = demo.courses.find((c) => c._id === req.params.courseId);
  if (!course) return missing(res);
  res.render("catalog/show", {
    title: course.title,
    course,
    sections: demo.sections.filter((s) => s.course._id === course._id),
  });
});
router.get("/student", page("student/index", "A little progress, every day."));
router.get(
  "/student/enrollments",
  page("student/enrollments", "My enrollments"),
);
router.get(
  "/student/schedule",
  page("student/schedule", "Make room for what matters."),
);
router.get(
  "/student/transcript",
  page("student/transcript", "Your academic journey"),
);
router.get("/student/profile", page("student/profile", "My profile"));
router.get(
  "/faculty",
  page("faculty/index", "Good teaching starts here.", "faculty"),
);
router.get(
  "/faculty/sections",
  page("faculty/sections", "My teaching sections", "faculty"),
);
for (const child of ["roster", "grades"]) {
  router.get(`/faculty/sections/:sectionId/${child}`, (req, res) => {
    const section = demo.sections.find((s) => s._id === req.params.sectionId);
    if (!section) return missing(res);
    res.render(`faculty/${child}`, {
      title: child === "roster" ? "Class roster" : "Gradebook",
      role: "faculty",
      section,
    });
  });
}
router.get("/admin", page("admin/index", "A campus, moving forward.", "admin"));
router.get(
  "/admin/courses",
  page("admin/courses", "Course management", "admin"),
);
// Literal /new comes before the parameter route.
router.get("/admin/courses/new", (req, res) =>
  res.render("admin/course-form", {
    title: "Create a course",
    role: "admin",
    course: null,
  }),
);
router.get("/admin/courses/:courseId/edit", (req, res) => {
  const course = demo.courses.find((c) => c._id === req.params.courseId);
  if (!course) return missing(res);
  res.render("admin/course-form", {
    title: "Edit course",
    role: "admin",
    course,
  });
});
router.get(
  "/admin/sections",
  page("admin/sections", "Section management", "admin"),
);
router.get(
  "/admin/sections/new",
  page("admin/section-form", "Create a section", "admin"),
);
router.get("/admin/users", page("admin/users", "People & access", "admin"));
router.get(
  "/admin/reports",
  page("admin/reports", "The semester at a glance", "admin"),
);
router.get("/preview/forbidden", (req, res) =>
  res
    .status(403)
    .render("shared/notAuthorized", { title: "Access restricted" }),
);

// Catch page namespaces only. API routes, including legacy /courses, pass through.
router.use((req, res, next) => {
  if (
    req.method === "GET" &&
    /^\/(auth|catalog|student|faculty|admin|preview)(\/|$)/.test(req.path)
  )
    return missing(res);
  next();
});
module.exports = router;
