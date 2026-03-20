export type GeneratedSectionKey = "podcast" | "quiz" | "report" | "story";

export type GeneratedEntry = {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
};

export type GeneratedSection = {
  key: GeneratedSectionKey;
  title: string;
  description: string;
  href: string;
  entries: GeneratedEntry[];
};

export const GENERATED_SECTIONS: GeneratedSection[] = [
  {
    key: "podcast",
    title: "Generated podcast",
    description: "Audio summaries created from your notes.",
    href: "/podcast",
    entries: [
      { id: "pod-1", title: "AI paper recap", subtitle: "12 min audio", createdAt: "2026-03-20" },
      { id: "pod-2", title: "Weekly sync highlights", subtitle: "8 min audio", createdAt: "2026-03-19" },
      { id: "pod-3", title: "Roadmap briefing", subtitle: "10 min audio", createdAt: "2026-03-18" },
      { id: "pod-4", title: "Book notes voice summary", subtitle: "9 min audio", createdAt: "2026-03-17" },
      { id: "pod-5", title: "Daily standup digest", subtitle: "6 min audio", createdAt: "2026-03-16" },
      { id: "pod-6", title: "Research trends snapshot", subtitle: "11 min audio", createdAt: "2026-03-15" },
    ],
  },
  {
    key: "quiz",
    title: "Generated quiz",
    description: "Practice questions auto-created from documents.",
    href: "/quiz",
    entries: [
      { id: "quiz-1", title: "LLM basics quiz", subtitle: "10 questions", createdAt: "2026-03-20" },
      { id: "quiz-2", title: "Project planning MCQ", subtitle: "8 questions", createdAt: "2026-03-19" },
      { id: "quiz-3", title: "Meeting notes revision", subtitle: "12 questions", createdAt: "2026-03-18" },
      { id: "quiz-4", title: "Data structures rapid quiz", subtitle: "15 questions", createdAt: "2026-03-17" },
      { id: "quiz-5", title: "Prompt engineering challenge", subtitle: "9 questions", createdAt: "2026-03-16" },
      { id: "quiz-6", title: "Team process checkup", subtitle: "7 questions", createdAt: "2026-03-15" },
    ],
  },
  {
    key: "report",
    title: "Generated reports",
    description: "Structured report outputs for quick review.",
    href: "/report",
    entries: [
      { id: "rep-1", title: "Q2 roadmap report", subtitle: "Detailed report", createdAt: "2026-03-20" },
      { id: "rep-2", title: "Weekly progress report", subtitle: "Summary report", createdAt: "2026-03-19" },
      { id: "rep-3", title: "Research summary report", subtitle: "Business report", createdAt: "2026-03-18" },
      { id: "rep-4", title: "Risk analysis report", subtitle: "Detailed report", createdAt: "2026-03-17" },
      { id: "rep-5", title: "Stakeholder update memo", subtitle: "Summary report", createdAt: "2026-03-16" },
      { id: "rep-6", title: "Sprint retrospective brief", subtitle: "Auto report", createdAt: "2026-03-15" },
    ],
  },
  {
    key: "story",
    title: "Generated story",
    description: "Creative story drafts produced from your content.",
    href: "/story",
    entries: [
      { id: "story-1", title: "The Silent Algorithm", subtitle: "Sci-fi short", createdAt: "2026-03-20" },
      { id: "story-2", title: "Sprint of Tomorrow", subtitle: "Workplace fiction", createdAt: "2026-03-19" },
      { id: "story-3", title: "Notebook Chronicles", subtitle: "Adventure draft", createdAt: "2026-03-18" },
      { id: "story-4", title: "Echoes of the Dataset", subtitle: "Mystery short", createdAt: "2026-03-17" },
      { id: "story-5", title: "Midnight Product Launch", subtitle: "Tech drama", createdAt: "2026-03-16" },
      { id: "story-6", title: "The Last Bug Fix", subtitle: "Thriller draft", createdAt: "2026-03-15" },
    ],
  },
];

export function getSectionByKey(key: GeneratedSectionKey) {
  return GENERATED_SECTIONS.find((section) => section.key === key);
}
