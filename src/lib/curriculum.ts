/** Official FWU BIT course entry */
export type Course = { code: string; name: string };

/** Official FWU BIT curriculum — course codes and names must not be altered. */
export const SEMESTER_COURSES: Record<number, Course[]> = {
  1: [
    { code: "BIT111", name: "Introduction to Information Technology" },
    { code: "BIT112", name: "C Programming" },
    { code: "BIT113", name: "Digital Logic" },
    { code: "BIT114", name: "Mathematics" },
    { code: "BIT115", name: "Technology and Society" },
  ],
  2: [
    { code: "BIT121", name: "Data Structure and Algorithms" },
    { code: "BIT122", name: "Object Oriented Programming" },
    { code: "BIT123", name: "Discrete Structure" },
    { code: "BIT124", name: "Probability and Statistics" },
    { code: "BIT125", name: "Technical Writing & Communication Skill" },
  ],
  3: [
    { code: "BIT211", name: "Computer Architecture" },
    { code: "BIT212", name: "Web Technology I" },
    { code: "BIT213", name: "Database Management System" },
    { code: "BIT214", name: "Computer Graphics" },
    { code: "BIT215", name: "Principles of Management" },
  ],
  4: [
    { code: "BIT221", name: "System Analysis and Design" },
    { code: "BIT222", name: "Data Communication and Networking" },
    { code: "BIT223", name: "Operating System" },
    { code: "BIT224", name: "Web Technology II" },
    { code: "BIT225", name: "Numerical Methods" },
  ],
  5: [
    { code: "BIT311", name: "Information Security" },
    { code: "BIT312", name: "Software Engineering" },
    { code: "BIT313", name: "Python Programming" },
    { code: "BIT314", name: "Artificial Intelligence" },
    { code: "BIT315", name: "Project I" },
  ],
  6: [
    { code: "BIT321", name: "Cloud Computing" },
    { code: "BIT322", name: "Cyber Security" },
    { code: "BIT323", name: "Data Science" },
    { code: "BIT324", name: "Research Methodology" },
    { code: "BIT325", name: ".NET Development" },
  ],
  7: [
    { code: "BIT411", name: "E-commerce & Digital Marketing" },
    { code: "BIT412", name: "Dev Ops" },
    { code: "BIT413", name: "Database Administration" },
    { code: "BIT414", name: "Project II" },
    { code: "BIT415", name: "Elective I" },
  ],
  8: [
    { code: "BIT421", name: "Data Warehousing and Data Mining" },
    { code: "BIT422", name: "Mobile App Development" },
    { code: "BIT423", name: "Elective II" },
    { code: "BIT424", name: "Internship" },
  ],
};

/** Total credit hours per semester (official). */
export const SEMESTER_CREDITS: Record<number, number> = {
  1: 15, 2: 15, 3: 15, 4: 15, 5: 14, 6: 15, 7: 15, 8: 18,
};

/** Elective subjects offered for Elective I / Elective II. */
export const ELECTIVE_SUBJECTS: string[] = [
  "Geographical Information System",
  "DSS and Expert System",
  "Simulation and Modeling",
  "Image Processing",
  "Network Security",
  "Internet of Things",
  "Wireless Communication",
  "Multimedia System",
  "Big Data and Analytics",
  "System and Network Administration",
  "Health Information System",
  "Management Information System",
  "Business Intelligence",
  "Digital Governance",
  "IT Ethics & Policies",
  "Blockchain Technology",
];

/** Subject names per semester (used for uploads, filters and browsing). */
export const SEMESTER_SUBJECTS: Record<number, string[]> = Object.fromEntries(
  Object.entries(SEMESTER_COURSES).map(([sem, courses]) => [Number(sem), courses.map((c) => c.name)]),
) as Record<number, string[]>;

/** Look up the official course code for a subject name. */
export const courseCode = (subject: string): string | undefined => {
  for (const courses of Object.values(SEMESTER_COURSES)) {
    const hit = courses.find((c) => c.name.toLowerCase() === subject.toLowerCase());
    if (hit) return hit.code;
  }
  return undefined;
};

export const EXAM_TYPES = [
  { value: "first_term", label: "First Term Exam" },
  { value: "mid_term", label: "Mid Term Exam" },
  { value: "final", label: "Final Exam" },
  { value: "board", label: "Board Exam" },
  { value: "model_questions", label: "Model Questions" },
] as const;

export type ExamTypeValue = typeof EXAM_TYPES[number]["value"];

export const examTypeLabel = (v: string) =>
  EXAM_TYPES.find((e) => e.value === v)?.label ?? v;

export const YEARS = [2078, 2079, 2080, 2081, 2082, 2083, 2084, 2085];

export const SEMESTER_ORDINAL = (n: number) => {
  const s = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
  return s[n - 1] ?? `${n}th`;
};

export const NOTIFICATION_TYPES = [
  { value: "new_paper", label: "New Paper Uploaded" },
  { value: "exam_reminder", label: "Exam Reminder" },
  { value: "announcement", label: "Important Announcement" },
] as const;

export const notifTypeLabel = (v: string) =>
  NOTIFICATION_TYPES.find((n) => n.value === v)?.label ?? v;