"use client";

import { useCallback, useRef, useState } from "react";
import {
  ClipboardPaste,
  Link2,
  Upload,
  X,
  Youtube,
} from "lucide-react";

function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 87.3 78"
      aria-hidden
      width={18}
      height={16}
    >
      <path
        fill="#00AC47"
        d="m6.6 66.85 3.21 6.24 3.13 6.1a3.57 3.57 0 0 0 6.31-.02l10.5-18.4-20.15-11.92z"
      />
      <path
        fill="#EA4335"
        d="M43.65 25.63 33.2 13.02a3.57 3.57 0 0 0-6.3 0L6.6 43.78l20.13 11.9 17.17-30.05z"
      />
      <path
        fill="#4285F4"
        d="M67.17 52h-47.1l-10.58 18.4c-.98 1.7.25 3.82 2.21 3.82h55.5a3.57 3.57 0 0 0 3.14-1.85L87.22 23.08c.98-1.7-.25-3.83-2.21-3.83H63.6L53.04 41.3 67.17 52z"
      />
    </svg>
  );
}

type PillButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  type?: "button" | "submit";
};

function PillButton({
  children,
  onClick,
  type = "button",
}: PillButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-600/90 bg-zinc-800/90 px-3.5 py-2 text-xs font-medium text-zinc-100 shadow-sm transition-colors hover:bg-zinc-700/90 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none sm:text-sm"
    >
      {children}
    </button>
  );
}

export type CreateNoteUploadZoneProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  files: File[];
  urls: string[];
  pastedSnippets: string[];
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onRemoveUrl: (index: number) => void;
  onRemovePasted: (index: number) => void;
  onPickFiles: () => void;
  onAddWebsite: () => void;
  onAddDriveLink: () => void;
  onAddCopiedText: () => void;
};

export function CreateNoteUploadZone({
  fileInputRef,
  files,
  urls,
  pastedSnippets,
  onFilesAdded,
  onRemoveFile,
  onRemoveUrl,
  onRemovePasted,
  onPickFiles,
  onAddWebsite,
  onAddDriveLink,
  onAddCopiedText,
}: CreateNoteUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const looseFileInputRef = useRef<HTMLInputElement>(null);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setIsDragging(false);
      const list = e.dataTransfer.files;
      if (list?.length) onFilesAdded(Array.from(list));
    },
    [onFilesAdded],
  );

  const hasList =
    files.length > 0 || urls.length > 0 || pastedSnippets.length > 0;

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-foreground">Documents</span>
      <div
        className={`rounded-2xl border border-dashed bg-[#1a1c1e] px-4 py-7 transition-[border-color,box-shadow] sm:px-6 sm:py-8 ${
          isDragging
            ? "border-zinc-400 shadow-[0_0_0_2px_rgba(161,161,170,0.35)]"
            : "border-zinc-600/80"
        }`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
          <button
            type="button"
            className="text-base font-medium text-zinc-100 hover:underline focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none sm:text-[1.05rem]"
            onClick={onPickFiles}
          >
            or drop your files
          </button>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            pdf, images, docs, audio,{" "}
            <button
              type="button"
              className="cursor-pointer text-zinc-400 underline decoration-zinc-500 underline-offset-2 hover:text-zinc-300"
              onClick={() => looseFileInputRef.current?.click()}
            >
              and more
            </button>
          </p>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <PillButton onClick={onPickFiles}>
            <Upload className="size-4 shrink-0 text-zinc-200" strokeWidth={2} />
            Upload files
          </PillButton>
          <PillButton onClick={onAddWebsite}>
            <Link2 className="size-4 shrink-0 text-zinc-300" strokeWidth={2} />
            <Youtube
              className="size-4 shrink-0 text-red-500"
              fill="currentColor"
              strokeWidth={0}
            />
            Websites
          </PillButton>
          <PillButton onClick={onAddDriveLink}>
            <GoogleDriveIcon className="shrink-0" />
            Drive
          </PillButton>
          <PillButton onClick={onAddCopiedText}>
            <ClipboardPaste className="size-4 shrink-0 text-zinc-200" />
            Copied text
          </PillButton>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        accept=".pdf,.doc,.docx,.txt,.md,.rtf,.odt,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.m4a,.mp4,.webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,image/*,audio/*,video/*"
        onChange={(e) => {
          const list = e.target.files;
          if (list?.length) onFilesAdded(Array.from(list));
          e.target.value = "";
        }}
      />
      <input
        ref={looseFileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          const list = e.target.files;
          if (list?.length) onFilesAdded(Array.from(list));
          e.target.value = "";
        }}
      />

      {hasList ? (
        <ul
          className="max-h-36 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 text-sm"
          aria-label="Added sources"
        >
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md py-1.5 pr-1 pl-2 hover:bg-muted/50"
            >
              <span className="min-w-0 flex-1 truncate" title={file.name}>
                <span className="text-muted-foreground">File · </span>
                {file.name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                type="button"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onRemoveFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {urls.map((url, index) => (
            <li
              key={`url-${index}-${url.slice(0, 24)}`}
              className="flex items-center justify-between gap-2 rounded-md py-1.5 pr-1 pl-2 hover:bg-muted/50"
            >
              <span className="min-w-0 flex-1 truncate" title={url}>
                <span className="text-muted-foreground">Link · </span>
                {url}
              </span>
              <button
                type="button"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onRemoveUrl(index)}
                aria-label="Remove link"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {pastedSnippets.map((text, index) => (
            <li
              key={`paste-${index}`}
              className="flex items-center justify-between gap-2 rounded-md py-1.5 pr-1 pl-2 hover:bg-muted/50"
            >
              <span className="min-w-0 flex-1 truncate" title={text}>
                <span className="text-muted-foreground">Text · </span>
                {text.slice(0, 120)}
                {text.length > 120 ? "…" : ""}
              </span>
              <button
                type="button"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onRemovePasted(index)}
                aria-label="Remove pasted text"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
