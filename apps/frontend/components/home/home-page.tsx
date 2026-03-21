"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Mic2, Pencil, ScrollText, Trash2 } from "lucide-react";

import { AppNavbar } from "@/components/app-navbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import { CreateNoteUploadZone } from "@/components/home/create-note-upload-zone";
import { Button } from "@/components/ui/button";
import { GENERATED_SECTIONS } from "@/lib/generated-content";

export type NoteRow = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
};

const PAGE_SIZE = 5;

/** Demo rows until API is wired */
const INITIAL_NOTES: NoteRow[] = [
  {
    id: "1",
    title: "Meeting recap",
    description: "Action items from the weekly sync.",
    date: "2026-03-18",
    time: "09:30",
  },
  {
    id: "2",
    title: "Project roadmap",
    description: "Milestones and deadlines Q2.",
    date: "2026-03-17",
    time: "14:15",
  },
  {
    id: "3",
    title: "Reading notes — AI",
    description: "Summary of latest LLM paper.",
    date: "2026-03-16",
    time: "11:00",
  },
  {
    id: "4",
    title: "Ideas backlog",
    description: "Features to explore next sprint.",
    date: "2026-03-15",
    time: "16:45",
  },
  {
    id: "5",
    title: "Book quotes",
    description: "Highlighted passages from chapter 3.",
    date: "2026-03-14",
    time: "08:20",
  },
  {
    id: "6",
    title: "Weekly goals",
    description: "Personal productivity checklist.",
    date: "2026-03-13",
    time: "07:00",
  },
  {
    id: "7",
    title: "Recipe — pasta",
    description: "Quick dinner idea for Friday.",
    date: "2026-03-12",
    time: "19:30",
  },
];

export function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<NoteRow[]>(INITIAL_NOTES);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const editTitleInputRef = useRef<HTMLInputElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  /** false = offline processing, true = AI model */
  const [createUseAiModel, setCreateUseAiModel] = useState(true);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createUrls, setCreateUrls] = useState<string[]>([]);
  const [createPastedSnippets, setCreatePastedSnippets] = useState<string[]>(
    [],
  );
  const [uploadZoneKey, setUploadZoneKey] = useState(0);
  const createTitleInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  const closeEditModal = useCallback(() => {
    setEditingId(null);
    setEditTitleValue("");
  }, []);

  const resetCreateForm = useCallback(() => {
    setCreateTitle("");
    setCreateUseAiModel(true);
    setCreateFiles([]);
    setCreateUrls([]);
    setCreatePastedSnippets([]);
    setUploadZoneKey((k) => k + 1);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateOpen(false);
    resetCreateForm();
  }, [resetCreateForm]);

  const totalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE));

  const pageNotes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return notes.slice(start, start + PAGE_SIZE);
  }, [notes, page]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(notes.length / PAGE_SIZE));
    setPage((p) => (p > maxPage ? maxPage : p));
  }, [notes.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 800);
    return () => window.clearTimeout(timer);
  }, []);

  function openCreateModal() {
    resetCreateForm();
    setCreateOpen(true);
  }

  function addFilesToCreate(f: File[]) {
    if (!f.length) return;
    setCreateFiles((prev) => [...prev, ...f]);
  }

  function removeCreateFile(index: number) {
    setCreateFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeCreateUrl(index: number) {
    setCreateUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function removeCreatePasted(index: number) {
    setCreatePastedSnippets((prev) => prev.filter((_, i) => i !== index));
  }

  function addWebsiteSource() {
    const url = window.prompt("Enter website URL");
    if (url?.trim()) setCreateUrls((prev) => [...prev, url.trim()]);
  }

  async function addCopiedTextSource() {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        setCreatePastedSnippets((prev) => [...prev, text.trim()]);
        return;
      }
    } catch {
      /* clipboard API blocked — fall back to prompt */
    }
    const text = window.prompt("Paste copied text here");
    if (text?.trim()) setCreatePastedSnippets((prev) => [...prev, text.trim()]);
  }

  async function submitCreateNote() {
    const trimmed = createTitle.trim();
    if (!trimmed) return;
    const newId = crypto.randomUUID();
    const now = new Date();
    const parts: string[] = [];
    if (createFiles.length > 0) {
      parts.push(
        `${createFiles.length} file(s): ${createFiles.map((f) => f.name).join(", ")}`,
      );
    }
    if (createUrls.length > 0) {
      parts.push(`Links: ${createUrls.join(" · ")}`);
    }
    if (createPastedSnippets.length > 0) {
      parts.push(
        `Copied text (${createPastedSnippets.length}): ${createPastedSnippets.map((t) => t.slice(0, 64) + (t.length > 64 ? "…" : "")).join(" | ")}`,
      );
    }
    const description =
      parts.length > 0 ? parts.join(" — ") : "No sources added";

    type PersistedSource = {
      id: string;
      kind: "file" | "website" | "text";
      label: string;
      fileName?: string;
      mimeType?: string;
      content?: string;
      dataUrl?: string; // for PDFs (iframe)
      url?: string;
    };

    const isTextLikeFile = (file: File) => {
      const t = file.type?.toLowerCase() ?? "";
      if (t.startsWith("text/")) return true;
      const name = (file.name ?? "").toLowerCase();
      return (
        name.endsWith(".txt") ||
        name.endsWith(".md") ||
        name.endsWith(".csv") ||
        name.endsWith(".json") ||
        name.endsWith(".html") ||
        name.endsWith(".xml") ||
        name.endsWith(".log")
      );
    };

    const isPdfFile = (file: File) => {
      const name = (file.name ?? "").toLowerCase();
      return file.type === "application/pdf" || name.endsWith(".pdf");
    };

    const readFileAsText = (file: File) =>
      file.text().catch(() => undefined);

    const readFileAsDataUrl = (file: File) =>
      new Promise<string | undefined>((resolve) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : undefined);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      });

    // Persist uploaded items so the notebook page can open + render them.
    const persistedItems: PersistedSource[] = [];

    for (const f of createFiles) {
      const fileName = f.name;
      if (isPdfFile(f)) {
        // Store PDF as data URL so we can render it in an iframe.
        const dataUrl = f.size <= 7_000_000 ? await readFileAsDataUrl(f) : undefined;
        persistedItems.push({
          id: crypto.randomUUID(),
          kind: "file",
          label: fileName,
          fileName,
          mimeType: f.type || "application/pdf",
          dataUrl,
        });
        continue;
      }

      if (isTextLikeFile(f) && f.size <= 2_000_000) {
        const content = await readFileAsText(f);
        persistedItems.push({
          id: crypto.randomUUID(),
          kind: "file",
          label: fileName,
          fileName,
          mimeType: f.type,
          content,
        });
        continue;
      }

      // Non-text / non-pdf files: store filename only.
      persistedItems.push({
        id: crypto.randomUUID(),
        kind: "file",
        label: fileName,
        fileName,
        mimeType: f.type,
      });
    }

    for (const u of createUrls) {
      persistedItems.push({
        id: crypto.randomUUID(),
        kind: "website",
        label: u,
        url: u,
      });
    }

    for (const t of createPastedSnippets) {
      const preview = t.length > 60 ? `${t.slice(0, 60)}…` : t;
      persistedItems.push({
        id: crypto.randomUUID(),
        kind: "text",
        label: preview,
        content: t,
      });
    }
    try {
      localStorage.setItem(
        `notebookllm:noteSources:${newId}`,
        JSON.stringify(persistedItems),
      );
      localStorage.setItem(
        `notebookllm:noteInferenceMode:${newId}`,
        createUseAiModel ? "ai" : "offline",
      );
    } catch {
      // Ignore storage errors (private mode, blocked storage, etc.)
    }

    setNotes((prev) => [
      {
        id: newId,
        title: trimmed,
        description,
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
      },
      ...prev,
    ]);
    setPage(1);
    closeCreateModal();
  }

  function handleDelete(id: string) {
    setNotes((prev) => prev.filter((row) => row.id !== id));
  }

  function openEditModal(id: string) {
    const row = notes.find((n) => n.id === id);
    setEditingId(id);
    setEditTitleValue(row?.title ?? "");
  }

  function submitEditTitle() {
    if (!editingId) return;
    const trimmed = editTitleValue.trim();
    if (!trimmed) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === editingId ? { ...n, title: trimmed } : n,
      ),
    );
    closeEditModal();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) closeEditModal();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            queueMicrotask(() => {
              editTitleInputRef.current?.focus();
              editTitleInputRef.current?.select();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit title</DialogTitle>
            <DialogDescription>
              Update the note title and submit to save.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitEditTitle();
            }}
          >
            <div className="grid gap-2">
              <label
                htmlFor="edit-title-input"
                className="text-sm font-medium"
              >
                Title
              </label>
              <input
                id="edit-title-input"
                ref={editTitleInputRef}
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Enter title"
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditModal}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!editTitleValue.trim()}>
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) closeCreateModal();
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            queueMicrotask(() => {
              createTitleInputRef.current?.focus();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Create note</DialogTitle>
            <DialogDescription>
              Add a title and upload one or more documents for this note.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitCreateNote();
            }}
          >
            <div className="grid gap-2">
              <label htmlFor="create-title-input" className="text-sm font-medium">
                Title
              </label>
              <input
                id="create-title-input"
                ref={createTitleInputRef}
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Note title"
                autoComplete="off"
              />
            </div>

            <div className="grid w-1/2 min-w-0 gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Processing
              </span>
              <div className="flex items-center justify-between gap-2 rounded-md border border-input bg-muted/20 px-2.5 py-1.5">
                <span
                  className={`text-xs ${
                    !createUseAiModel
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Offline
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={createUseAiModel}
                  aria-label="Toggle between offline and AI model processing"
                  onClick={() => setCreateUseAiModel((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    createUseAiModel ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-background shadow-sm transition-transform ${
                      createUseAiModel ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span
                  className={`text-xs ${
                    createUseAiModel
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  AI model
                </span>
              </div>
            </div>

            <CreateNoteUploadZone
              key={uploadZoneKey}
              fileInputRef={createFileInputRef}
              files={createFiles}
              urls={createUrls}
              pastedSnippets={createPastedSnippets}
              onFilesAdded={addFilesToCreate}
              onRemoveFile={removeCreateFile}
              onRemoveUrl={removeCreateUrl}
              onRemovePasted={removeCreatePasted}
              onPickFiles={() => createFileInputRef.current?.click()}
              onAddWebsite={addWebsiteSource}
              onAddCopiedText={addCopiedTextSource}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={!createTitle.trim()}>
                Create note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AppNavbar />

      <main className="mx-auto flex w-full max-w-[min(100%,96rem)] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My notes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Table view with pagination. Create notes from the button on the
              right.
            </p>
          </div>
          <Button type="button" onClick={openCreateModal} className="shrink-0">
            Create notes
          </Button>
        </div>

        <section className="mt-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Generated content
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quick access to recently generated outputs.
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }, (_, i) => (
                  <article
                    key={`generated-skeleton-${i}`}
                    className="rounded-lg border bg-card p-4"
                  >
                    <div className="animate-pulse">
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-8 w-8 rounded-md bg-muted" />
                        <div className="h-5 w-8 rounded-full bg-muted" />
                      </div>
                      <div className="mt-3 h-4 w-2/3 rounded bg-muted" />
                      <div className="mt-2 h-3 w-full rounded bg-muted" />
                      <div className="mt-1 h-3 w-5/6 rounded bg-muted" />
                      <div className="mt-3 space-y-2">
                        <div className="h-3 w-full rounded bg-muted" />
                        <div className="h-3 w-11/12 rounded bg-muted" />
                        <div className="h-3 w-9/12 rounded bg-muted" />
                      </div>
                    </div>
                  </article>
                ))
              : GENERATED_SECTIONS.map((item) => {
              const icon =
                item.key === "podcast" ? (
                  <Mic2 className="size-4 text-primary" />
                ) : item.key === "quiz" ? (
                  <ScrollText className="size-4 text-primary" />
                ) : (
                  <FileText className="size-4 text-primary" />
                );
              return (
                <article key={item.key} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex rounded-md bg-primary/10 p-2">
                      {icon}
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                      {item.entries.length}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <Link
                      href={item.href}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {item.entries.slice(0, 3).map((entry) => {
                      const href = `${item.href}?id=${encodeURIComponent(entry.id)}`;
                      return (
                        <li key={entry.id} className="truncate">
                          <Link href={href} className="hover:text-foreground hover:underline">
                            - {entry.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-6 overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/25">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    S. No
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Title
                  </th>
                  <th className="min-w-[200px] px-4 py-3 font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Time
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Edit title
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: PAGE_SIZE }, (_, i) => (
                    <tr key={`notes-skeleton-${i}`}>
                      <td className="px-4 py-3" colSpan={7}>
                        <div className="animate-pulse">
                          <div className="h-4 w-full rounded bg-muted" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : pageNotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No notes yet. Click &quot;Create notes&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  pageNotes.map((row, index) => {
                    const sNo = (page - 1) * PAGE_SIZE + index + 1;
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {sNo}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <Link
                            href={`/notebook?note=${encodeURIComponent(row.id)}`}
                            className="text-foreground hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {row.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.description}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{row.date}</td>
                        <td className="px-4 py-3 tabular-nums">{row.time}</td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(row.id)}
                            aria-label={`Edit title: ${row.title}`}
                          >
                            <Pencil className="size-3.5" />
                            <span className="ml-1">Edit</span>
                          </Button>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(row.id)}
                            aria-label={`Delete: ${row.title}`}
                          >
                            <Trash2 className="size-3.5" />
                            <span className="ml-1">Delete</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <nav
          className="mt-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center"
          aria-label="Table pagination"
        >
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
            <span className="mx-2 text-border">·</span>
            {notes.length} note{notes.length !== 1 ? "s" : ""} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <div className="hidden items-center gap-1 sm:flex">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={p === page ? "default" : "outline"}
                  size="icon-sm"
                  className="min-w-8"
                  onClick={() => setPage(p)}
                  aria-label={`Go to page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </nav>

      </main>
    </div>
  );
}
