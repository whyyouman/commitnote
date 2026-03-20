import { QuizWorkspace } from "@/components/quiz/quiz-workspace";
import { GeneratedListPage } from "@/components/generated/generated-list-page";
import { getSectionByKey } from "@/lib/generated-content";

type QuizPageProps = {
  searchParams: Promise<{ note?: string; id?: string }>;
};

export default async function QuizPage({ searchParams }: QuizPageProps) {
  const { note, id } = await searchParams;
  if (!id) {
    return <GeneratedListPage section={getSectionByKey("quiz")!} noteId={note} />;
  }
  return <QuizWorkspace noteId={note} generatedId={id} />;
}

