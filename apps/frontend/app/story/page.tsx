import { GeneratedListPage } from "@/components/generated/generated-list-page";
import { StoryWorkspace } from "@/components/story/story-workspace";
import { getSectionByKey } from "@/lib/generated-content";

type StoryPageProps = {
  searchParams: Promise<{ note?: string; id?: string }>;
};

export default async function StoryPage({ searchParams }: StoryPageProps) {
  const { note, id } = await searchParams;
  if (!id) {
    return <GeneratedListPage section={getSectionByKey("story")!} noteId={note} />;
  }
  return <StoryWorkspace noteId={note} generatedId={id} />;
}
