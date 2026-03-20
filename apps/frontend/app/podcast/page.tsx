import { PodcastWorkspace } from "@/components/podcast/podcast-workspace";
import { GeneratedListPage } from "@/components/generated/generated-list-page";
import { getSectionByKey } from "@/lib/generated-content";

type PodcastPageProps = {
  searchParams: Promise<{ note?: string; id?: string }>;
};

export default async function PodcastPage({
  searchParams,
}: PodcastPageProps) {
  const { note, id } = await searchParams;
  if (!id) {
    return (
      <GeneratedListPage
        section={getSectionByKey("podcast")!}
        noteId={note}
      />
    );
  }
  return <PodcastWorkspace noteId={note} generatedId={id} />;
}

