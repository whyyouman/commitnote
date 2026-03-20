"use client";

import { AppNavbar } from "@/components/app-navbar";

export function StoryWorkspace({
  noteId,
  generatedId,
}: {
  noteId?: string;
  generatedId?: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />
      <main className="mx-auto max-w-[min(100%,96rem)] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Story</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated story preview for the selected item.
        </p>

        <section className="mt-4 rounded-xl border bg-background p-4">
          <div className="text-xs text-muted-foreground">
            Story id: <span className="font-medium text-foreground">{generatedId ?? "N/A"}</span>
            {" · "}
            Note id: <span className="font-medium text-foreground">{noteId ?? "N/A"}</span>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
            This is a placeholder story workspace. You can wire real generated
            story content by `generatedId` here.
          </p>
        </section>
      </main>
    </div>
  );
}
