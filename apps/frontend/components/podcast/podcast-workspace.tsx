"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  Pause,
  Play,
  RotateCcw,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";

import { AppNavbar } from "@/components/app-navbar";
import { Button } from "@/components/ui/button";

type PersistedSource = {
  id: string;
  kind: "file" | "website" | "text" | "legacy";
  label: string;
  content?: string;
  dataUrl?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
};

function parsePersistedSources(raw: string): PersistedSource[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: unknown, i: number) => {
      if (typeof item === "string") {
        return { id: `legacy-${i}`, kind: "legacy", label: item };
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
          content: anyItem.content,
          dataUrl: anyItem.dataUrl,
          url: anyItem.url,
          fileName: anyItem.fileName,
          mimeType: anyItem.mimeType,
        };
      }
      return { id: `legacy-${i}`, kind: "legacy", label: String(item) };
    });
  } catch {
    return [];
  }
}

export function PodcastWorkspace({
  noteId,
  generatedId,
}: {
  noteId?: string;
  generatedId?: string;
}) {
  const storageKey = noteId
    ? `notebookllm:noteSources:${noteId}`
    : "notebookllm:noteSources:__default__";

  const [sources, setSources] = useState<PersistedSource[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [script, setScript] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [progressSeconds, setProgressSeconds] = useState(0);
  const progressTimerRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const selected = useMemo(
    () => sources.find((s) => s.id === selectedId) ?? null,
    [sources, selectedId],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setSources([]);
        return;
      }
      setSources(parsePersistedSources(raw));
    } catch {
      setSources([]);
    }
  }, [storageKey]);

  const fileOptions = useMemo(
    () => sources.filter((s) => s.kind === "file" || s.kind === "text"),
    [sources],
  );

  useEffect(() => {
    // If user removed the selector UI, pick the first available source automatically.
    if (!selectedId && fileOptions.length > 0) {
      setSelectedId(fileOptions[0].id);
    }
  }, [fileOptions, selectedId]);

  const voiceTextToRead = useMemo(() => {
    const basis =
      script.trim() ||
      selected?.content?.trim() ||
      selected?.url?.trim() ||
      selected?.fileName?.trim() ||
      selected?.label?.trim() ||
      "";
    return basis;
  }, [script, selected]);

  const estimateDurationSeconds = (text: string) => {
    // rough estimate for UX: 15 chars/sec
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return 0;
    return Math.max(5, Math.ceil(cleaned.length / 15));
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setProgressSeconds(0);
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgressTimer = (durationSeconds: number) => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    const start = Date.now();
    progressTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setProgressSeconds(Math.min(durationSeconds, elapsed));
    }, 200);
  };

  const playTTS = () => {
    const text = voiceTextToRead;
    if (!text.trim()) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    stopSpeaking();
    const duration = estimateDurationSeconds(text);
    startProgressTimer(duration);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = 1;
    utterance.pitch = 1;
    utteranceRef.current = utterance;
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgressSeconds(duration);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };

    setIsSpeaking(true);
    setIsPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const pauseResumeTTS = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!isSpeaking && !isPaused) {
      playTTS();
      return;
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsSpeaking(false);
  };

  useEffect(() => {
    // If user changes volume while playing, restart so volume is applied.
    if (!isSpeaking && !isPaused) return;
    if (!voiceTextToRead.trim()) return;
    // restart with new volume
    playTTS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />

      <main className="mx-auto max-w-[min(100%,96rem)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Podcast</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Select a source (auto-picks the first one). Then use the player
              controls (play/pause, progress, and volume) to listen.
            </p>
            {generatedId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Selected podcast id: {generatedId}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="outline" className="gap-2">
            <Upload className="size-4" />
            Upload sources
          </Button>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-1">
          <section className="rounded-xl border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-muted-foreground">
                Script
              </div>
              <div className="flex gap-2">
              </div>
            </div>

            {selected ? (
              <div className="mt-3 rounded-lg border bg-muted/20 px-3 py-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Using
                </div>
                <div className="truncate text-sm font-medium text-foreground">
                  {selected.label}
                </div>
              </div>
            ) : null}

            {script.trim() ? (
              <div className="mt-4">
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="min-h-[340px] w-full resize-y rounded-lg border bg-muted/20 p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Mic className="size-6" strokeWidth={1.5} />
                </div>
                <p className="mt-3 text-sm font-medium">Voice readout</p>
                <p className="mt-1 max-w-[560px] text-xs leading-relaxed text-muted-foreground">
                  The text below is what will be read by voice from your selected
                  source.
                </p>
                <div className="mt-4 w-full max-w-[760px] rounded-lg border bg-background p-3 text-left">
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-sm">
                    {voiceTextToRead || "No selected source content available."}
                  </pre>
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="text-sm font-medium text-muted-foreground">
                Player
              </div>
              <div className="mt-2 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                    disabled={!voiceTextToRead.trim()}
                    onClick={() => {
                      if (isSpeaking || isPaused) pauseResumeTTS();
                      else playTTS();
                    }}
                    aria-label={isPaused ? "Resume" : isSpeaking ? "Pause" : "Play"}
                  >
                    {isPaused ? (
                      <Play className="size-5" />
                    ) : isSpeaking ? (
                      <Pause className="size-5" />
                    ) : (
                      <Play className="size-5" />
                    )}
                  </button>

                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    disabled={!voiceTextToRead.trim()}
                    onClick={stopSpeaking}
                    aria-label="Stop"
                  >
                    <RotateCcw className="size-5" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(progressSeconds)}s
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {estimateDurationSeconds(voiceTextToRead)}s
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min(
                            100,
                            (progressSeconds /
                              Math.max(1, estimateDurationSeconds(voiceTextToRead))) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-background text-muted-foreground">
                    {volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

