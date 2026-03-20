"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardCopy, FileDown, RotateCcw } from "lucide-react";

import { AppNavbar } from "@/components/app-navbar";
import { Button } from "@/components/ui/button";

type PersistedQuizConfig = {
  sourceId?: string;
  sourceLabel?: string;
  type?: string;
  tone?: "Professional" | "Simple";
  length?: "Short" | "Medium" | "Long";
  generatedAt?: number;
};

type ReportType =
  | "Auto (Recommended)"
  | "Summary Report"
  | "Detailed Report"
  | "Business Report";

type ReportTone = "Professional" | "Simple";
type ReportLength = "Short" | "Medium" | "Long";

type ReportModel = {
  title: string;
  overview: string;
  keyPoints: string[];
  importantDetails: string;
  conclusion: string;
  updatedAt: number;
};

function formatNiceDate(ts: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function pickReportType(raw?: string): ReportType {
  switch (raw) {
    case "Summary Report":
    case "Detailed Report":
    case "Business Report":
      return raw;
    default:
      return "Auto (Recommended)";
  }
}

function buildReport(params: {
  sourceLabel: string;
  reportType: ReportType;
  tone: ReportTone;
  length: ReportLength;
  seed: number;
}): ReportModel {
  const { sourceLabel, reportType, tone, length, seed } = params;
  const safeLabel = (sourceLabel || "your notes").trim();
  const variant = seed % 3;

  const professionalOverview = [
    `This report summarizes the key ideas extracted from “${safeLabel}”. It focuses on clarity, relevance, and practical takeaways.`,
    `A structured overview of “${safeLabel}”, highlighting the most important themes and how they connect to the main intent.`,
    `Here is a concise synthesis of “${safeLabel}”, designed to help you quickly understand and apply the information.`,
  ];

  const simpleOverview = [
    `This report explains the main ideas from “${safeLabel}” in a simple way.`,
    `Here’s a clear overview of “${safeLabel}”, so you can understand it quickly.`,
    `This is a short, easy summary of “${safeLabel}” that you can use right away.`,
  ];

  const overviewVariants = tone === "Simple" ? simpleOverview : professionalOverview;

  const conclusionVariants =
    tone === "Simple"
      ? [
          `Use the points above and take the next step with confidence.`,
          `In short, “${safeLabel}” gives you actionable takeaways—review and apply.`,
          `This is a solid starting point. Update it as you learn more.`,
        ]
      : [
          `Use the points above as your guide: review the key takeaways, validate assumptions, and apply the conclusions to your next step.`,
          `In short, “${safeLabel}” provides actionable insight. Revisit the key points and expand them where needed for your context.`,
          `This is a dependable baseline report: refine it with your decisions, and keep iterating based on new information.`,
        ];

  const baseKeyPoints = [
    `Core theme: ${safeLabel}`,
    `Primary goal: understand the intent behind the content`,
    `Most relevant evidence and examples`,
    `Actionable next steps derived from the material`,
  ];

  const businessExtra = [
    `Stakeholder impact and expected outcomes`,
    `Risk/assumption notes and how to validate them`,
    `Recommended prioritization and delivery approach`,
  ];

  const maxKeyPoints =
    length === "Short" ? 5 : length === "Long" ? 9 : 7;

  const keyPoints =
    reportType === "Business Report"
      ? [...baseKeyPoints, ...businessExtra].slice(0, maxKeyPoints)
      : reportType === "Detailed Report"
        ? [
            ...baseKeyPoints,
            "Supporting details and nuanced distinctions",
            "Constraints and edge cases",
          ].slice(0, maxKeyPoints)
        : [...baseKeyPoints, "A short recommended plan of action"].slice(
            0,
            maxKeyPoints,
          );

  const importantDetails =
    reportType === "Detailed Report"
      ? length === "Short"
        ? `Important details from “${safeLabel}”:\n\n1) Key definitions\n2) Common pitfalls\n`
        : length === "Long"
          ? `Important details from “${safeLabel}”:\n\n1) Key definitions and terminology\n2) Relationships between major concepts\n3) Common pitfalls and how to avoid them\n4) Practical examples that reinforce understanding\n5) Edge cases and assumptions to double-check`
          : `Important details from “${safeLabel}”:\n\n1) Key definitions and terminology\n2) Relationships between major concepts\n3) Common pitfalls and how to avoid them\n4) Practical examples that reinforce understanding`
      : reportType === "Business Report"
        ? length === "Short"
          ? `Important details for decision-makers:\n\n- What to decide next\n- How to validate assumptions`
          : length === "Long"
            ? `Important details for decision-makers:\n\n- What this means for teams and timelines\n- Where assumptions may break under real conditions\n- What to measure to confirm success\n- Risk mitigation steps and ownership`
            : `Important details for decision-makers:\n\n- What this means for teams and timelines\n- Where assumptions may break under real conditions\n- What to measure to confirm success`
        : tone === "Simple"
          ? length === "Short"
            ? `Important details:\n\n- The essential points\n- A simple next step`
            : length === "Long"
              ? `Important details:\n\n- The essential points to remember\n- The most useful phrasing to reuse\n- A clear path to turn the content into action\n- A quick checklist to confirm understanding`
              : `Important details:\n\n- The essential points to remember\n- The most useful phrasing to reuse\n- A clear path for turning the content into action`
          : `Important details:\n\n- The essential points to remember\n- The most useful phrasing to reuse\n- A clear path for turning the content into action`;

  return {
    title: "📄 Report Title",
    overview: overviewVariants[variant] ?? overviewVariants[0],
    keyPoints,
    importantDetails,
    conclusion: conclusionVariants[variant] ?? conclusionVariants[0],
    updatedAt: Date.now(),
  };
}

export function ReportWorkspace({
  noteId,
  generatedId,
}: {
  noteId?: string;
  generatedId?: string;
}) {
  const configKey = noteId
    ? `notebookllm:reportConfig:${noteId}`
    : "notebookllm:reportConfig:__default__";
  const contentKey = noteId
    ? `notebookllm:reportContent:${noteId}`
    : "notebookllm:reportContent:__default__";

  const [reportType, setReportType] = useState<ReportType>(
    "Auto (Recommended)",
  );
  const [reportTone, setReportTone] = useState<ReportTone>("Professional");
  const [reportLength, setReportLength] = useState<ReportLength>("Medium");
  const [sourceLabel, setSourceLabel] = useState<string>("your notes");
  const [report, setReport] = useState<ReportModel | null>(null);
  const seedRef = useRef<number>(Date.now());

  useEffect(() => {
    let config: PersistedQuizConfig | null = null;
    try {
      const raw = localStorage.getItem(configKey);
      config = raw ? (JSON.parse(raw) as PersistedQuizConfig) : null;
    } catch {
      config = null;
    }

    const nextType = pickReportType(config?.type);
    const nextLabel = (config?.sourceLabel ?? "your notes").trim();
    const nextTone: ReportTone =
      config?.tone === "Simple" ? "Simple" : "Professional";
    const nextLength: ReportLength =
      config?.length === "Short" || config?.length === "Long" || config?.length === "Medium"
        ? config.length
        : "Medium";

    setReportType(nextType);
    setReportTone(nextTone);
    setReportLength(nextLength);
    setSourceLabel(nextLabel);

    // Try to load previously generated report content.
    try {
      const raw = localStorage.getItem(contentKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ReportModel;
        if (parsed && typeof parsed === "object") {
          setReport(parsed);
          return;
        }
      }
    } catch {
      // fallback to building
    }

    const nextReport = buildReport({
      sourceLabel: nextLabel,
      reportType: nextType,
      tone: nextTone,
      length: nextLength,
      seed: seedRef.current,
    });
    setReport(nextReport);

    try {
      localStorage.setItem(contentKey, JSON.stringify(nextReport));
    } catch {
      // ignore
    }
  }, [configKey, contentKey]);

  const reportText = useMemo(() => {
    if (!report) return "";
    const kp = report.keyPoints.map((k) => `• ${k}`).join("\n");
    return [
      report.title,
      "",
      `Overview:\n${report.overview}`,
      "",
      `Key Points:\n${kp}`,
      "",
      `Important Details:\n${report.importantDetails}`,
      "",
      `Conclusion:\n${report.conclusion}`,
    ].join("\n");
  }, [report]);

  const onCopy = async () => {
    if (!reportText.trim()) return;
    try {
      await navigator.clipboard.writeText(reportText);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = reportText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const onDownloadPdf = () => {
    // We don't use a PDF library; instead we open a print dialog, so user can “Save as PDF”.
    if (!report) return;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Report</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 28px; }
            h1 { font-size: 20px; margin: 0 0 16px; }
            h2 { font-size: 14px; margin: 18px 0 8px; }
            p { white-space: pre-wrap; }
            ul { padding-left: 18px; }
            .muted { color: #475569; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="muted">Generated: ${new Date(report.updatedAt).toLocaleString()}</div>
          <h1>${report.title}</h1>
          <h2>[ Overview ]</h2>
          <p>${report.overview}</p>
          <h2>[ Key Points ]</h2>
          <ul>${report.keyPoints.map((k) => `<li>${k}</li>`).join("")}</ul>
          <h2>[ Important Details ]</h2>
          <p>${report.importantDetails}</p>
          <h2>[ Conclusion ]</h2>
          <p>${report.conclusion}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    // Let the popup render first.
    setTimeout(() => {
      win.print();
    }, 250);
  };

  const onRegenerate = () => {
    const nextSeed = Date.now();
    seedRef.current = nextSeed;
    const nextReport = buildReport({
      sourceLabel,
      reportType,
      tone: reportTone,
      length: reportLength,
      seed: nextSeed,
    });
    setReport(nextReport);
    try {
      localStorage.setItem(contentKey, JSON.stringify(nextReport));
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />

      <main className="mx-auto max-w-[min(100%,96rem)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              📄 Report
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              UI placeholder report. Generated from your selected source.
            </p>
            {generatedId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Selected report id: {generatedId}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={onDownloadPdf}
              disabled={!report}
            >
              <FileDown className="size-4" />
              Download PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={onCopy}
              disabled={!report}
            >
              <ClipboardCopy className="size-4" />
              Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={onRegenerate}
            >
              <RotateCcw className="size-4" />
              Regenerate
            </Button>
          </div>
        </div>

        <section className="mt-4 rounded-xl border bg-background p-4">
          <div className="text-xs text-muted-foreground">
            Type: <span className="font-medium text-foreground">{reportType}</span>
            {" · "}
            Tone:{" "}
            <span className="font-medium text-foreground">{reportTone}</span>
            {" · "}
            Length:{" "}
            <span className="font-medium text-foreground">{reportLength}</span>
            {" · "}
            Source:{" "}
            <span className="font-medium text-foreground">
              {sourceLabel}
            </span>
          </div>

          <div className="mt-3 text-sm font-medium text-muted-foreground">
            {report ? `Updated: ${formatNiceDate(report.updatedAt)}` : "—"}
          </div>

          <div className="mt-4 space-y-6">
            <div>
              <div className="text-sm font-semibold">[ Overview ]</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {report?.overview ?? "—"}
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold">[ Key Points ]</div>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {(report?.keyPoints ?? []).map((p, i) => (
                  <li key={`${p}-${i}`}>{p}</li>
                ))}
                {!report?.keyPoints?.length ? (
                  <li>—</li>
                ) : null}
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold">[ Important Details ]</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {report?.importantDetails ?? "—"}
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold">[ Conclusion ]</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {report?.conclusion ?? "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <Link href="/" className="inline-flex">
            <Button type="button" variant="outline" className="gap-2">
              Back to Home
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
}

