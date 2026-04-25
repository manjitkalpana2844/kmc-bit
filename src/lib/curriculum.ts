export const SEMESTER_SUBJECTS: Record<number, string[]> = {
  1: ["C Programming", "Digital Logic", "Mathematics I", "Sociology", "English"],
  2: ["Data Structures", "Mathematics II", "Microprocessor", "Financial Accounting", "Statistics"],
  3: ["Java Programming", "Computer Organization", "Discrete Mathematics", "DBMS", "Economics"],
  4: ["Operating System", "Computer Networks", "Software Engineering", "Numerical Methods", "Web Technology"],
  5: ["System Analysis & Design", "AI", "Computer Graphics", "Information Security", "Project I"],
  6: ["Mobile App Development", "Data Mining", "Cloud Computing", "Machine Learning", "Project II"],
  7: ["IoT", "Cyber Security", "Big Data", "Research Methodology", "Internship"],
  8: ["Final Project", "Seminar", "Professional Practice", "Viva Preparation"],
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