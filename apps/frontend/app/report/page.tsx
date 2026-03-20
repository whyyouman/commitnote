import { ReportWorkspace } from "@/components/report/report-workspace";
import { GeneratedListPage } from "@/components/generated/generated-list-page";
import { getSectionByKey } from "@/lib/generated-content";

type ReportPageProps = {
  searchParams: Promise<{ note?: string; id?: string }>;
};

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const { note, id } = await searchParams;
  if (!id) {
    return <GeneratedListPage section={getSectionByKey("report")!} noteId={note} />;
  }
  return <ReportWorkspace noteId={note} generatedId={id} />;
}

