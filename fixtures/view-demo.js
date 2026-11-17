// Presentation fixtures only. No database reads, writes, or authentication.
// Keep this object shape when you replace fixtures with controller locals.
const courses = [
  {
    _id: "cs101",
    code: "CS 101",
    title: "Introduction to Computing",
    department: "Computer Science",
    credits: 3,
    description:
      "Build a foundation in computational thinking, algorithms, and the ideas that power modern software.",
    prerequisites: [],
    color: "blue",
  },
  {
    _id: "cs201",
    code: "CS 201",
    title: "Data Structures & Algorithms",
    department: "Computer Science",
    credits: 3,
    description:
      "Turn complex problems into elegant solutions. Explore lists, trees, graphs, and algorithm design.",
    prerequisites: [{ code: "CS 101", title: "Introduction to Computing" }],
    color: "purple",
  },
  {
    _id: "math201",
    code: "MATH 201",
    title: "Linear Algebra",
    department: "Mathematics",
    credits: 3,
    description:
      "Discover vectors, matrices, and linear transformations, with applications in computing and science.",
    prerequisites: [],
    color: "gold",
  },
  {
    _id: "eng102",
    code: "ENG 102",
    title: "Academic Writing",
    department: "Humanities",
    credits: 3,
    description:
      "Find your academic voice through critical reading, research, and clear, persuasive writing.",
    prerequisites: [],
    color: "green",
  },
  {
    _id: "cs210",
    code: "CS 210",
    title: "Database Management",
    department: "Computer Science",
    credits: 3,
    description:
      "Model information, design databases, and learn to query and manage data with confidence.",
    prerequisites: [{ code: "CS 101", title: "Introduction to Computing" }],
    color: "blue",
  },
  {
    _id: "stat201",
    code: "STAT 201",
    title: "Probability & Statistics",
    department: "Mathematics",
    credits: 3,
    description:
      "Make sense of uncertainty through probability, statistical reasoning, and practical data analysis.",
    prerequisites: [],
    color: "gold",
  },
];
const sections = courses.slice(0, 4).map((course, i) => ({
  _id: `section-${i + 1}`,
  course,
  term: "2026-1",
  sectionCode: `A${i + 1}`,
  faculty: {
    name: [
      "Dr. Elena Reyes",
      "Prof. Daniel Cruz",
      "Dr. Maya Santos",
      "Prof. Sofia Lim",
    ][i],
  },
  capacity: 35,
  enrolledCount: [28, 35, 24, 30][i],
  status: "open",
  schedule: [
    {
      day: ["MON", "TUE", "WED", "THU"][i],
      start: [540, 630, 780, 540][i],
      end: [630, 720, 870, 630][i],
      room: ["Tech 301", "Tech 204", "Science 102", "Arts 201"][i],
    },
  ],
}));
const enrollments = sections.map((section, i) => ({
  _id: `enrollment-${i + 1}`,
  course: section.course,
  section,
  term: "2026-1",
  status: i === 1 ? "waitlisted" : "enrolled",
  grade: {},
}));
const students = [
  "Alex Morgan",
  "Jamie Rivera",
  "Sam Navarro",
  "Taylor Garcia",
  "Jordan Lee",
  "Casey Ramos",
].map((name, i) => ({
  _id: `student-${i + 1}`,
  name,
  idNumber: `2026-${String(i + 101).padStart(5, "0")}`,
  email: `${name.toLowerCase().replace(" ", ".")}@example.edu`,
  role: "student",
  department: "Computer Science",
  isActive: true,
}));
const transcript = [
  {
    code: "CS 100",
    title: "Computing Fundamentals",
    credits: 3,
    letter: "A",
    points: 4,
  },
  {
    code: "MATH 101",
    title: "College Algebra",
    credits: 3,
    letter: "A−",
    points: 3.7,
  },
  {
    code: "ENG 101",
    title: "Communication Skills",
    credits: 3,
    letter: "B+",
    points: 3.3,
  },
  {
    code: "HUM 101",
    title: "Understanding the Self",
    credits: 3,
    letter: "A",
    points: 4,
  },
];
module.exports = {
  courses,
  sections,
  enrollments,
  students,
  transcript,
  term: "2026-1",
  termLabel: "First semester · 2026–2027",
  user: students[0],
};
