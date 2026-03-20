import { NotebookWorkspace } from "@/components/notebook/notebook-workspace";

type NotebookPageProps = {
  searchParams: Promise<{ note?: string }>;
};

export default async function NotebookPage({ searchParams }: NotebookPageProps) {
  const { note } = await searchParams;
  return <NotebookWorkspace noteId={note} />;
}
