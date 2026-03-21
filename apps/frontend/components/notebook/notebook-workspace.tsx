"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenText,
  FileText,
  GitBranch,
  LayoutPanelLeft,
  ClipboardList,
  Plus,
  Trash2,
  Upload,
  Mic,
  Sparkles,
} from "lucide-react";

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

type NotebookWorkspaceProps = {
  noteId?: string;
};

type PersistedSource = {
  id: string;
  kind: "file" | "website" | "text" | "legacy";
  label: string;
  fileName?: string;
  mimeType?: string;
  content?: string;
  dataUrl?: string;
  url?: string;
};

/** Set `true` to show Podcast Style in the Generate Podcast modal */
const SHOW_PODCAST_STYLE_UI = false;

/** Split view: Sources | Chat — uses same theme as home (bg-background, etc.) */
export function NotebookWorkspace({ noteId }: NotebookWorkspaceProps) {
  const [chatInput, setChatInput] = useState("");
  const [leftPaneWidth, setLeftPaneWidth] = useState(35);
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const storageKey = noteId
    ? `notebookllm:noteSources:${noteId}`
    : "notebookllm:noteSources:__default__";
  const [uploadedItems, setUploadedItems] = useState<PersistedSource[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const sourceCount = uploadedItems.length;
  const activeSource = activeSourceId
    ? uploadedItems.find((s) => s.id === activeSourceId) ?? null
    : null;

  const [addSourcesOpen, setAddSourcesOpen] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [addUrls, setAddUrls] = useState<string[]>([]);
  const [addPastedSnippets, setAddPastedSnippets] = useState<string[]>([]);

  const [genModalOpen, setGenModalOpen] = useState(false);

  const [podcastModalOpen, setPodcastModalOpen] = useState(false);
  const [podcastSelectedId, setPodcastSelectedId] = useState<string>("");
  const [podcastMode, setPodcastMode] = useState<"offline" | "ai">("ai");
  const [podcastAiProvider, setPodcastAiProvider] = useState<
    "OpenAI" | "Claude" | "Gemini"
  >("OpenAI");

  const [podcastStyle, setPodcastStyle] = useState<
    | "Auto (Recommended)"
    | "Storytelling Podcast"
    | "Educational Podcast"
    | "News Style"
  >("Auto (Recommended)");

  const [podcastHostVoice, setPodcastHostVoice] = useState<"Male" | "Female">(
    "Male",
  );
  const [podcastGuestVoice, setPodcastGuestVoice] = useState<"Male" | "Female">(
    "Female",
  );

  const [podcastLength, setPodcastLength] = useState<
    | "Short (2–3 min)"
    | "Medium (5–7 min)"
    | "Long (10+ min)"
  >("Medium (5–7 min)");

  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storySelectedId, setStorySelectedId] = useState<string>("");
  const [storyMode, setStoryMode] = useState<"offline" | "ai">("ai");
  const [storyAiProvider, setStoryAiProvider] = useState<
    "OpenAI" | "Claude" | "Gemini"
  >("OpenAI");
  const [storyType, setStoryType] = useState<
    "Summary" | "Dramatic" | "Cinematic" | "Simple (ELI5)" | "Business"
  >("Summary");

  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizSelectedId, setQuizSelectedId] = useState<string>("");
  const [quizMode, setQuizMode] = useState<"offline" | "ai">("ai");
  const [quizAiKey, setQuizAiKey] = useState<
    "openai key" | "clawd key" | "geminie key"
  >("openai key");
  const [quizDuration, setQuizDuration] = useState<
    "5 min" | "10 min" | "15 min" | "30 min" | "45 min"
  >("10 min");
  const [quizDifficulty, setQuizDifficulty] = useState<
    "Easy" | "Medium" | "Hard"
  >("Medium");

  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [reportsSelectedId, setReportsSelectedId] = useState<string>("");
  const [reportsMode, setReportsMode] = useState<"offline" | "ai">("ai");
  const [reportsAiProvider, setReportsAiProvider] = useState<
    "OpenAI" | "Claude" | "Gemini"
  >("OpenAI");
  const [reportsType, setReportsType] = useState<
    | "Auto (Recommended)"
    | "Summary Report"
    | "Detailed Report"
    | "Business Report"
  >("Auto (Recommended)");
  const [reportsTone, setReportsTone] = useState<"Professional" | "Simple">(
    "Professional",
  );
  const [reportsLength, setReportsLength] = useState<
    "Short" | "Medium" | "Long"
  >("Medium");

  const resizeFromClientX = useCallback((clientX: number) => {
    const container = splitContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(75, Math.max(25, next));
    setLeftPaneWidth(clamped);
  }, []);

  const startResizing = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (window.innerWidth < 768) return;
      event.preventDefault();
      setIsResizing(true);

      const onPointerMove = (e: PointerEvent) => {
        resizeFromClientX(e.clientX);
      };

      const stopResizing = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", stopResizing);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopResizing);
    },
    [resizeFromClientX],
  );

  const closeAddSourcesModal = useCallback(() => {
    setAddSourcesOpen(false);
    setAddFiles([]);
    setAddUrls([]);
    setAddPastedSnippets([]);
    if (addFileInputRef.current) addFileInputRef.current.value = "";
  }, []);

  const openAddSourcesModal = useCallback(() => {
    setAddSourcesOpen(true);
    // keep previous values until user changes; we reset on close to avoid losing while typing
    // (optional) focus happens via Dialog onOpenAutoFocus
  }, []);

  const removeAddFile = useCallback((index: number) => {
    setAddFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeAddUrl = useCallback((index: number) => {
    setAddUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeAddPasted = useCallback((index: number) => {
    setAddPastedSnippets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addWebsiteSource = useCallback(() => {
    const url = window.prompt("Enter website URL");
    if (url?.trim()) setAddUrls((prev) => [...prev, url.trim()]);
  }, []);

  const addCopiedTextSource = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        setAddPastedSnippets((prev) => [...prev, text.trim()]);
        return;
      }
    } catch {
      /* clipboard API blocked — fall back to prompt */
    }
    const text = window.prompt("Paste copied text here");
    if (text?.trim()) setAddPastedSnippets((prev) => [...prev, text.trim()]);
  }, []);

  const submitAddSources = useCallback(() => {
    const nextItems: PersistedSource[] = [
      ...addFiles.map((f) => ({
        id: crypto.randomUUID(),
        kind: "file" as const,
        label: f.name,
        fileName: f.name,
        mimeType: f.type,
      })),
      ...addUrls.map((u) => ({
        id: crypto.randomUUID(),
        kind: "website" as const,
        label: u,
        url: u,
      })),
      ...addPastedSnippets.map((t) => {
        const preview = t.length > 80 ? `${t.slice(0, 80)}…` : t;
        return {
          id: crypto.randomUUID(),
          kind: "text" as const,
          label: `Text: ${preview}`,
          content: t,
        };
      }),
    ];

    if (nextItems.length === 0) return;

    setUploadedItems((prev) => {
      const updated = [...nextItems, ...prev];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setActiveSourceId(null);
    closeAddSourcesModal();
  }, [
    addFiles,
    addPastedSnippets,
    addUrls,
    closeAddSourcesModal,
    storageKey,
  ]);

  // Load persisted uploaded sources from the Home page.
  // If not available, we keep it empty (so the empty state shows).
  useEffect(() => {
    if (!storageKey) {
      setUploadedItems([]);
      setActiveSourceId(null);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setUploadedItems([]);
        setActiveSourceId(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const mapped: PersistedSource[] = parsed.map((item: unknown, i) => {
          if (typeof item === "string") {
            return {
              id: `legacy-${i}`,
              kind: "legacy",
              label: item,
            };
          }

          if (item && typeof item === "object") {
            const anyItem = item as Partial<PersistedSource>;
            return {
              id: anyItem.id ?? `legacy-${i}`,
              kind: (anyItem.kind ?? "legacy") as PersistedSource["kind"],
              label:
                anyItem.label ??
                anyItem.fileName ??
                anyItem.url ??
                "Untitled",
              fileName: anyItem.fileName,
              mimeType: anyItem.mimeType,
              content: anyItem.content,
              dataUrl: anyItem.dataUrl,
              url: anyItem.url,
            };
          }

          return {
            id: `legacy-${i}`,
            kind: "legacy",
            label: String(item),
          };
        });

        setUploadedItems(mapped);
        setActiveSourceId(null);
      } else {
        setUploadedItems([]);
        setActiveSourceId(null);
      }
    } catch {
      setUploadedItems([]);
      setActiveSourceId(null);
    }
  }, [storageKey]);

  return (
    <div
      className={`flex min-h-screen flex-col bg-background font-sans text-foreground ${isResizing ? "cursor-col-resize select-none" : ""}`}
    >
      <AppNavbar />

      <Dialog
        open={addSourcesOpen}
        onOpenChange={(open) => {
          if (!open) closeAddSourcesModal();
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>Add sources</DialogTitle>
            <DialogDescription>
              Upload one or more documents (or add websites / pasted text).
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitAddSources();
            }}
          >
            <CreateNoteUploadZone
              fileInputRef={addFileInputRef}
              files={addFiles}
              urls={addUrls}
              pastedSnippets={addPastedSnippets}
              onFilesAdded={(files) => setAddFiles((prev) => [...prev, ...files])}
              onRemoveFile={removeAddFile}
              onRemoveUrl={removeAddUrl}
              onRemovePasted={removeAddPasted}
              onPickFiles={() => addFileInputRef.current?.click()}
              onAddWebsite={addWebsiteSource}
              onAddCopiedText={addCopiedTextSource}
            />

            <DialogFooter>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
                onClick={closeAddSourcesModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  addFiles.length === 0 &&
                  addUrls.length === 0 &&
                  addPastedSnippets.length === 0
                }
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                Add
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={genModalOpen}
        onOpenChange={(open) => {
          if (!open) setGenModalOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate</DialogTitle>
            <DialogDescription>
              Choose an action for your current sources.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-sm font-medium text-foreground">
              What do you want to create?
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              This is a UI placeholder — connect your generator logic later.
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="group flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted"
              onClick={() => {
                setGenModalOpen(false);
                setPodcastModalOpen(true);
              }}
            >
              <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <Mic className="size-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Generate Podcast</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Turn sources into narration.
                </div>
              </div>
            </button>

            <button
              type="button"
              className="group flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted"
              onClick={() => {
                setGenModalOpen(false);
                setQuizSelectedId("");
                setQuizModalOpen(true);
              }}
            >
              <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Generate Quiz</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Create questions from your notes.
                </div>
              </div>
            </button>

            <button
              type="button"
              className="group flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted"
              onClick={() => {
                setGenModalOpen(false);
                setReportsSelectedId("");
                setReportsModalOpen(true);
              }}
            >
              <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Reports</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Summaries and insights.
                </div>
              </div>
            </button>

            {/* Mind Map card hidden for now (requested). */}

            <button
              type="button"
              className="group flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted"
              onClick={() => {
                setGenModalOpen(false);
                setStorySelectedId("");
                setStoryType("Summary");
                setStoryModalOpen(true);
              }}
            >
              <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <BookOpenText className="size-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Generate story</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Turn your sources into a narrative.
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={podcastModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPodcastModalOpen(false);
            setPodcastSelectedId("");
            setPodcastMode("ai");
            setPodcastAiProvider("OpenAI");
            setPodcastStyle("Auto (Recommended)");
            setPodcastHostVoice("Male");
            setPodcastGuestVoice("Female");
            setPodcastLength("Medium (5–7 min)");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Podcast</DialogTitle>
            <DialogDescription>
              Select source, choose generation mode, then configure podcast options.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 p-4 shadow-sm">
            <div className="flex items-start gap-3 border-b pb-4">
              <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <Mic className="size-5" />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="podcast-source-select"
                  className="text-sm font-medium text-foreground"
                >
                  Uploaded file <span className="text-destructive">*</span>
                </label>
                <select
                  id="podcast-source-select"
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={podcastSelectedId}
                  onChange={(e) => setPodcastSelectedId(e.target.value)}
                >
                  <option value="" disabled>
                    Select a file to generate from
                  </option>
                  {uploadedItems
                    .filter((s) => s.kind === "file")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 border-b pt-3 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">
                    Generation mode
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    {podcastMode === "ai" ? `AI: ${podcastAiProvider}` : "Offline"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={podcastMode === "offline"}
                    onClick={() => setPodcastMode("offline")}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      podcastMode === "offline"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-foreground hover:bg-muted"
                    }`}
                  >
                    Offline
                  </button>
                  <button
                    type="button"
                    aria-pressed={podcastMode === "ai"}
                    onClick={() => setPodcastMode("ai")}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      podcastMode === "ai"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-foreground hover:bg-muted"
                    }`}
                  >
                    AI model
                  </button>
                </div>
                <p
                  id="podcast-generation-mode-scripting"
                  data-testid="podcast-generation-mode-scripting"
                  className="mt-2 text-xs font-medium text-muted-foreground"
                >
                  Scripting
                </p>
              </div>

              {podcastMode === "ai" ? (
                <div className="sm:col-span-2 border-b pb-4">
                  <label
                    htmlFor="podcast-ai-provider"
                    className="text-sm font-medium text-foreground"
                  >
                    AI model provider
                  </label>
                  <select
                    id="podcast-ai-provider"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={podcastAiProvider}
                    onChange={(e) =>
                      setPodcastAiProvider(
                        e.target.value as typeof podcastAiProvider,
                      )
                    }
                  >
                    <option value="OpenAI">OpenAI</option>
                    <option value="Claude">Claude</option>
                    <option value="Gemini">Gemini</option>
                  </select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Provider selection only; key is picked from Settings.
                  </p>
                </div>
              ) : null}

              {SHOW_PODCAST_STYLE_UI ? (
                <div>
                  <label
                    htmlFor="podcast-style"
                    className="text-sm font-medium text-foreground"
                  >
                    Podcast Style
                  </label>
                  <select
                    id="podcast-style"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={podcastStyle}
                    onChange={(e) =>
                      setPodcastStyle(
                        e.target.value as typeof podcastStyle,
                      )
                    }
                  >
                    <option value="Auto (Recommended)">
                      Auto (Recommended)
                    </option>
                    <option value="Storytelling Podcast">
                      Storytelling Podcast
                    </option>
                    <option value="Educational Podcast">
                      Educational Podcast
                    </option>
                    <option value="News Style">News Style</option>
                  </select>
                </div>
              ) : null}

              <div>
                <div className="text-sm font-medium text-foreground">
                  Speakers
                </div>
                <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-center text-sm text-muted-foreground">
                  2 character podcast available
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="text-sm font-medium text-foreground">Voice</div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="podcast-voice-host"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Host
                    </label>
                    <select
                      id="podcast-voice-host"
                      className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={podcastHostVoice}
                      onChange={(e) =>
                        setPodcastHostVoice(e.target.value as "Male" | "Female")
                      }
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="podcast-voice-guest"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Guest
                    </label>
                    <select
                      id="podcast-voice-guest"
                      className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={podcastGuestVoice}
                      onChange={(e) =>
                        setPodcastGuestVoice(
                          e.target.value as "Male" | "Female",
                        )
                      }
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="podcast-length"
                  className="text-sm font-medium text-foreground"
                >
                  Length
                </label>
                <select
                  id="podcast-length"
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={podcastLength}
                  onChange={(e) =>
                    setPodcastLength(
                      e.target.value as typeof podcastLength,
                    )
                  }
                >
                  <option value="Short (2–3 min)">Short (2–3 min)</option>
                  <option value="Medium (5–7 min)">Medium (5–7 min)</option>
                  <option value="Long (10+ min)">Long (10+ min)</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            {!podcastSelectedId ? (
              <p className="mr-auto text-xs text-muted-foreground">
                Select a source file to enable generation.
              </p>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
              onClick={() => setPodcastModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              disabled={!podcastSelectedId}
              onClick={() => {
                const selected = uploadedItems.find(
                  (s) => s.id === podcastSelectedId,
                );
                const stylePart = SHOW_PODCAST_STYLE_UI
                  ? ` | Style: ${podcastStyle}`
                  : "";
                const voicePart = `Host: ${podcastHostVoice} | Guest: ${podcastGuestVoice}`;
                if (selected) {
                  setChatInput(
                    podcastMode === "ai"
                      ? `Generate Podcast (AI model: ${podcastAiProvider}) from: ${selected.label}${stylePart} | ${voicePart} | Length: ${podcastLength}`
                      : `Generate Podcast (Offline) from: ${selected.label}${stylePart} | ${voicePart} | Length: ${podcastLength}`,
                  );
                } else {
                  setChatInput(
                    podcastMode === "ai"
                      ? `Generate Podcast (AI model: ${podcastAiProvider})${stylePart} | ${voicePart} | Length: ${podcastLength}`
                      : `Generate Podcast (Offline)${stylePart} | ${voicePart} | Length: ${podcastLength}`,
                  );
                }
                setPodcastModalOpen(false);
              }}
            >
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={storyModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setStoryModalOpen(false);
            setStoryMode("ai");
            setStoryAiProvider("OpenAI");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Story</DialogTitle>
            <DialogDescription>
              Select source, choose generation options, then click Generate.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 p-4 shadow-sm">
            <div className="grid gap-4">
              <div className="flex items-start gap-3 border-b pb-4">
                <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <BookOpenText className="size-5" />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="story-source-select"
                    className="text-sm font-medium text-foreground"
                  >
                    Uploaded file <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="story-source-select"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={storySelectedId}
                    onChange={(e) => setStorySelectedId(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a file to generate from
                    </option>
                    {uploadedItems
                      .filter((s) => s.kind === "file")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-3 border-b pb-4">
                <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <BookOpenText className="size-5 opacity-80" />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="story-type-select"
                    className="text-sm font-medium text-foreground"
                  >
                    Story Type
                  </label>
                  <select
                    id="story-type-select"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={storyType}
                    onChange={(e) =>
                      setStoryType(e.target.value as typeof storyType)
                    }
                  >
                    <option value="Summary">Summary</option>
                    <option value="Dramatic">Dramatic</option>
                    <option value="Cinematic">Cinematic</option>
                    <option value="Simple (ELI5)">Simple (ELI5)</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
              </div>

              <div className="border-b pt-4 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">
                    Generation mode
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    {storyMode === "ai" ? `AI: ${storyAiProvider}` : "Offline"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={storyMode === "offline"}
                    onClick={() => setStoryMode("offline")}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      storyMode === "offline"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-foreground hover:bg-muted"
                    }`}
                  >
                    Offline
                  </button>
                  <button
                    type="button"
                    aria-pressed={storyMode === "ai"}
                    onClick={() => setStoryMode("ai")}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      storyMode === "ai"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-foreground hover:bg-muted"
                    }`}
                  >
                    AI model
                  </button>
                </div>
              </div>

              {storyMode === "ai" ? (
                <div className="border-b pt-4 pb-4">
                  <label
                    htmlFor="story-ai-provider"
                    className="text-sm font-medium text-foreground"
                  >
                    AI model provider
                  </label>
                  <select
                    id="story-ai-provider"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={storyAiProvider}
                    onChange={(e) =>
                      setStoryAiProvider(
                        e.target.value as typeof storyAiProvider,
                      )
                    }
                  >
                    <option value="OpenAI">OpenAI</option>
                    <option value="Claude">Claude</option>
                    <option value="Gemini">Gemini</option>
                  </select>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            {!storySelectedId ? (
              <p className="mr-auto text-xs text-muted-foreground">
                Select a source file to enable generation.
              </p>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
              onClick={() => setStoryModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              disabled={!storySelectedId}
              onClick={() => {
                const selected = uploadedItems.find(
                  (s) => s.id === storySelectedId,
                );
                if (selected) {
                  setChatInput(
                    storyMode === "ai"
                      ? `Generate story (${storyType}) [AI: ${storyAiProvider}] from: ${selected.label}`
                      : `Generate story (${storyType}) [Offline] from: ${selected.label}`,
                  );
                } else {
                  setChatInput(
                    storyMode === "ai"
                      ? `Generate story (${storyType}) [AI: ${storyAiProvider}]`
                      : `Generate story (${storyType}) [Offline]`,
                  );
                }
                setStoryModalOpen(false);
              }}
            >
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={quizModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setQuizModalOpen(false);
            setQuizSelectedId("");
            setQuizMode("ai");
            setQuizAiKey("openai key");
            setQuizDuration("10 min");
            setQuizDifficulty("Medium");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Quiz</DialogTitle>
            <DialogDescription>
              Select source, choose mode and quiz settings, then click Generate.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 p-4 shadow-sm">
            <div className="flex items-start gap-3 border-b pb-4">
              <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <ClipboardList className="size-5" />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="quiz-source-select"
                  className="text-sm font-medium text-foreground"
                >
                  Uploaded file <span className="text-destructive">*</span>
                </label>
                <select
                  id="quiz-source-select"
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={quizSelectedId}
                  onChange={(e) => setQuizSelectedId(e.target.value)}
                >
                  <option value="" disabled>
                    Select a file to generate from
                  </option>
                  {uploadedItems
                    .filter((s) => s.kind === "file")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-4 border-b pt-4 pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-foreground">Generation mode</div>
                <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {quizMode === "ai" ? `AI: ${quizAiKey}` : "Offline"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`inline-flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    quizMode === "offline"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                  onClick={() => setQuizMode("offline")}
                  aria-pressed={quizMode === "offline"}
                >
                  Offline
                </button>
                <button
                  type="button"
                  className={`inline-flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    quizMode === "ai"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                  onClick={() => setQuizMode("ai")}
                  aria-pressed={quizMode === "ai"}
                >
                  AI model
                </button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Choose AI model for a better experience and to generate good
                questions.
              </div>
            </div>

            {quizMode === "ai" ? (
              <div className="mt-4 border-b pt-4 pb-4">
                <div className="text-sm font-medium text-foreground">
                  AI Provider Key
                </div>
                <label
                  htmlFor="quiz-ai-provider"
                  className="mt-3 block text-xs font-medium text-muted-foreground"
                >
                  Choose key
                </label>
                <select
                  id="quiz-ai-provider"
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={quizAiKey}
                  onChange={(e) =>
                    setQuizAiKey(e.target.value as typeof quizAiKey)
                  }
                >
                  <option value="openai key">openai key</option>
                  <option value="clawd key">clawd key</option>
                  <option value="geminie key">geminie key</option>
                </select>
                <div className="mt-2 text-xs text-muted-foreground">
                  Placeholder field (no real keys are used).
                </div>
              </div>
            ) : null}

            <div className="mt-4 border-b pt-4 pb-4">
              <div className="text-sm font-medium text-foreground">
                Quiz Settings
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="quiz-duration"
                    className="text-sm font-medium text-foreground"
                  >
                    Duration
                  </label>
                  <select
                    id="quiz-duration"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={quizDuration}
                    onChange={(e) =>
                      setQuizDuration(
                        e.target.value as typeof quizDuration,
                      )
                    }
                  >
                    <option value="5 min">5 min</option>
                    <option value="10 min">10 min</option>
                    <option value="15 min">15 min</option>
                    <option value="30 min">30 min</option>
                    <option value="45 min">45 min</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="quiz-difficulty"
                    className="text-sm font-medium text-foreground"
                  >
                    Difficulty
                  </label>
                  <select
                    id="quiz-difficulty"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={quizDifficulty}
                    onChange={(e) =>
                      setQuizDifficulty(
                        e.target.value as typeof quizDifficulty,
                      )
                    }
                  >
                    <option value="Easy">1. Easy</option>
                    <option value="Medium">2. Medium</option>
                    <option value="Hard">3. Hard</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            {!quizSelectedId ? (
              <p className="mr-auto text-xs text-muted-foreground">
                Select a source file to enable generation.
              </p>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
              onClick={() => setQuizModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              disabled={!quizSelectedId}
              onClick={() => {
                const selected = uploadedItems.find(
                  (s) => s.id === quizSelectedId,
                );
                const modeText = quizMode === "offline" ? "Offline" : "AI model";
                const settingsText = `Duration: ${quizDuration} | Difficulty: ${quizDifficulty}`;
                if (selected) {
                  // Persist quiz config so the /quiz page can render matching questions.
                  try {
                    const configKey = noteId
                      ? `notebookllm:quizConfig:${noteId}`
                      : "notebookllm:quizConfig:__default__";
                    localStorage.setItem(
                      configKey,
                      JSON.stringify({
                        sourceId: selected.id,
                        sourceLabel: selected.label,
                        mode: quizMode,
                        aiKey: quizMode === "ai" ? quizAiKey : undefined,
                        duration: quizDuration,
                        difficulty: quizDifficulty,
                        generatedAt: Date.now(),
                      }),
                    );
                  } catch {
                    // Ignore storage errors
                  }
                  setChatInput(
                    quizMode === "ai"
                      ? `Generate Quiz (${modeText} - ${quizAiKey}) | ${settingsText} from: ${selected.label}`
                      : `Generate Quiz (${modeText}) | ${settingsText} from: ${selected.label}`,
                  );
                } else {
                  setChatInput(
                    quizMode === "ai"
                      ? `Generate Quiz (${modeText} - ${quizAiKey}) | ${settingsText}`
                      : `Generate Quiz (${modeText}) | ${settingsText}`,
                  );
                }
                setQuizModalOpen(false);
              }}
            >
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reportsModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setReportsModalOpen(false);
            setReportsSelectedId("");
            setReportsMode("ai");
            setReportsAiProvider("OpenAI");
            setReportsType("Auto (Recommended)");
            setReportsTone("Professional");
            setReportsLength("Medium");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Reports</DialogTitle>
            <DialogDescription>
              Select source, choose report options, then click Generate.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 p-4 shadow-sm">
            <div className="flex items-start gap-3 border-b pb-4">
              <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <BarChart3 className="size-5" />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="reports-source-select"
                  className="text-sm font-medium text-foreground"
                >
                  Uploaded file <span className="text-destructive">*</span>
                </label>
                <select
                  id="reports-source-select"
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={reportsSelectedId}
                  onChange={(e) => setReportsSelectedId(e.target.value)}
                >
                  <option value="" disabled>
                    Select a file to generate from
                  </option>
                  {uploadedItems
                    .filter((s) => s.kind === "file")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-4 border-b pt-4 pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-foreground">
                  Generation mode
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {reportsMode === "ai" ? `AI: ${reportsAiProvider}` : "Offline"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={reportsMode === "offline"}
                  onClick={() => setReportsMode("offline")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    reportsMode === "offline"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-foreground hover:bg-muted"
                  }`}
                >
                  Offline
                </button>
                <button
                  type="button"
                  aria-pressed={reportsMode === "ai"}
                  onClick={() => setReportsMode("ai")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    reportsMode === "ai"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-foreground hover:bg-muted"
                  }`}
                >
                  AI model
                </button>
              </div>
            </div>

            {reportsMode === "ai" ? (
              <div className="mt-4 border-b pt-4 pb-4">
                <label
                  htmlFor="reports-ai-provider"
                  className="text-sm font-medium text-foreground"
                >
                  AI model provider
                </label>
                <select
                  id="reports-ai-provider"
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={reportsAiProvider}
                  onChange={(e) =>
                    setReportsAiProvider(
                      e.target.value as typeof reportsAiProvider,
                    )
                  }
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Claude">Claude</option>
                  <option value="Gemini">Gemini</option>
                </select>
              </div>
            ) : null}

            <div className="mt-4 border-b pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <FileText className="size-5" />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="reports-type"
                    className="text-sm font-medium text-foreground"
                  >
                    Type
                  </label>
                  <select
                    id="reports-type"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={reportsType}
                    onChange={(e) =>
                      setReportsType(
                        e.target.value as typeof reportsType,
                      )
                    }
                  >
                    <option value="Auto (Recommended)">
                      Auto (Recommended)
                    </option>
                    <option value="Summary Report">Summary Report</option>
                    <option value="Detailed Report">Detailed Report</option>
                    <option value="Business Report">Business Report</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 border-b pt-4 pb-4">
              <div className="text-sm font-medium text-foreground">Tone</div>
              <select
                id="reports-tone"
                className="mt-3 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                value={reportsTone}
                onChange={(e) =>
                  setReportsTone(e.target.value as typeof reportsTone)
                }
              >
                <option value="Professional">Professional</option>
                <option value="Simple">Simple</option>
              </select>
            </div>

            <div className="mt-4 border-b pt-4 pb-4">
              <div className="text-sm font-medium text-foreground">Length</div>
              <select
                id="reports-length"
                className="mt-3 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                value={reportsLength}
                onChange={(e) =>
                  setReportsLength(e.target.value as typeof reportsLength)
                }
              >
                <option value="Short">Short</option>
                <option value="Medium">Medium</option>
                <option value="Long">Long</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            {!reportsSelectedId ? (
              <p className="mr-auto text-xs text-muted-foreground">
                Select a source file to enable generation.
              </p>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
              onClick={() => setReportsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              disabled={!reportsSelectedId}
              onClick={() => {
                const selected = uploadedItems.find(
                  (s) => s.id === reportsSelectedId,
                );
                if (selected) {
                  // Persist report config so the /report page can render.
                  try {
                    const configKey = noteId
                      ? `notebookllm:reportConfig:${noteId}`
                      : "notebookllm:reportConfig:__default__";
                    localStorage.setItem(
                      configKey,
                      JSON.stringify({
                        sourceId: selected.id,
                        sourceLabel: selected.label,
                        mode: reportsMode,
                        aiProvider: reportsMode === "ai" ? reportsAiProvider : undefined,
                        type: reportsType,
                        tone: reportsTone,
                        length: reportsLength,
                        generatedAt: Date.now(),
                      }),
                    );
                  } catch {
                    // Ignore storage errors
                  }
                  setChatInput(
                    reportsMode === "ai"
                      ? `Generate Reports (${reportsType}) [AI: ${reportsAiProvider}] | Tone: ${reportsTone} | Length: ${reportsLength} from: ${selected.label}`
                      : `Generate Reports (${reportsType}) [Offline] | Tone: ${reportsTone} | Length: ${reportsLength} from: ${selected.label}`,
                  );
                } else {
                  setChatInput(
                    reportsMode === "ai"
                      ? `Generate Reports (${reportsType}) [AI: ${reportsAiProvider}] | Tone: ${reportsTone} | Length: ${reportsLength}`
                      : `Generate Reports (${reportsType}) [Offline] | Tone: ${reportsTone} | Length: ${reportsLength}`,
                  );
                }
                setReportsModalOpen(false);
              }}
            >
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {noteId ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-1.5 sm:px-6 lg:px-8">
          <span className="text-[11px] text-muted-foreground">
            Note{" "}
            <span className="font-mono text-foreground/80">
              …{noteId.slice(-8)}
            </span>
          </span>
        </div>
      ) : null}

      <div
        ref={splitContainerRef}
        className="flex min-h-0 flex-1 flex-col md:flex-row"
      >
        {/* ——— Sources ——— */}
        <aside
          className="flex min-h-[42vh] w-full min-w-0 flex-col border-border md:min-h-0 md:border-r"
          style={{ flexBasis: `calc(${leftPaneWidth}% - 4px)` }}
        >
          <header className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2 md:px-5">
            <h1 className="text-[15px] font-medium tracking-tight text-muted-foreground">
              Sources
            </h1>
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle panel layout"
            >
              <LayoutPanelLeft className="size-5" strokeWidth={1.5} />
            </button>
          </header>

          <div className="shrink-0 px-4 pb-4 md:px-5">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-transparent py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              onClick={openAddSourcesModal}
            >
              <Plus className="size-4" strokeWidth={2} />
              Add sources
            </button>
          </div>

          {activeSource ? (
            <div className="flex flex-1 flex-col px-4 pb-12 md:px-5">
              <div className="pt-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    onClick={() => setActiveSourceId(null)}
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Delete selected"
                    onClick={() => {
                      const id = activeSource.id;
                      setUploadedItems((prev) => {
                        const next = prev.filter((s) => s.id !== id);
                        try {
                          localStorage.setItem(storageKey, JSON.stringify(next));
                        } catch {
                          // ignore
                        }
                        return next;
                      });
                      setActiveSourceId(null);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">
                    {activeSource.label}
                  </div>

                  {activeSource.kind === "file" && activeSource.dataUrl ? (
                    <iframe
                      title="PDF preview"
                      src={activeSource.dataUrl}
                      className="h-[65vh] w-full rounded-lg border bg-background"
                    />
                  ) : activeSource.content ? (
                    <pre className="whitespace-pre-wrap break-words rounded-lg border bg-muted/20 p-3 text-sm text-foreground">
                      {activeSource.content}
                    </pre>
                  ) : activeSource.kind === "website" && activeSource.url ? (
                    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <a
                        className="break-all text-primary hover:underline"
                        href={activeSource.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {activeSource.url}
                      </a>
                    </div>
                  ) : activeSource.kind === "text" && activeSource.content ? (
                    <pre className="whitespace-pre-wrap break-words rounded-lg border bg-muted/20 p-3 text-sm text-foreground">
                      {activeSource.content}
                    </pre>
                  ) : (
                    <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                      Content preview not available for this item.
                      <br />
                      If this is a PDF, upload it from the Home page so we can
                      store it for preview.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : uploadedItems.length > 0 ? (
            <div className="flex flex-1 flex-col px-4 pb-12 md:px-5">
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Uploaded files
                </p>
              </div>
              <ul className="mt-3 space-y-2 overflow-y-auto pr-1">
                {uploadedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-sm text-foreground hover:underline"
                      onClick={() => setActiveSourceId(item.id)}
                      aria-label={`Open ${item.label}`}
                    >
                      {item.label}
                    </button>
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`Delete ${item.label}`}
                      onClick={() => {
                        setUploadedItems((prev) => {
                          const next = prev.filter((s) => s.id !== item.id);
                          try {
                            localStorage.setItem(
                              storageKey,
                              JSON.stringify(next),
                            );
                          } catch {
                            // ignore
                          }
                          return next;
                        });
                        if (activeSourceId === item.id) setActiveSourceId(null);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="size-6" strokeWidth={1.5} />
              </div>
              <p className="text-[15px] font-medium text-foreground">
                Saved sources will appear here
              </p>
              <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
                Click Add sources to add PDFs, websites, text, videos, or audio
                files.
              </p>
            </div>
          )}
        </aside>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          className="relative hidden w-2 shrink-0 cursor-col-resize bg-border/60 transition-colors hover:bg-primary/50 md:block"
          onPointerDown={startResizing}
        >
          <div className="absolute top-1/2 left-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/50" />
        </div>

        {/* ——— Chat ——— */}
        <section
          className="flex min-h-[42vh] w-full min-w-0 flex-col border-t border-border md:min-h-0 md:border-t-0"
          style={{ flexBasis: `calc(${100 - leftPaneWidth}% - 4px)` }}
        >
          <header className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2 md:px-5">
            <h2 className="text-[15px] font-medium tracking-tight text-muted-foreground">
              Chat
            </h2>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Features"
                onClick={() => setGenModalOpen(true)}
              >
                <Sparkles className="size-5" strokeWidth={1.5} />
              </button>
            </div>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 text-center">
            <p className="text-lg font-medium text-foreground">
              Ask anything on your stuff
            </p>
          </div>

          <div className="mt-auto border-t border-border p-4 md:p-5">
            <div className="flex items-center gap-3 rounded-full border border-border bg-muted/40 py-1.5 pl-4 pr-1.5 shadow-sm">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything on your stuff"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {sourceCount} sources
              </span>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                disabled={sourceCount === 0 && !chatInput.trim()}
                aria-label="Send"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground sm:hidden">
              {sourceCount} sources
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
