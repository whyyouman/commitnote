/* eslint-disable @typescript-eslint/no-unnecessary-condition */
"use client";

import { useEffect, useState } from "react";

import { AppNavbar } from "@/components/app-navbar";
import { Button } from "@/components/ui/button";

export default function SettingPage() {
  const [openAiKey, setOpenAiKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      setOpenAiKey(localStorage.getItem("notebookllm:openaiKey") ?? "");
      setClaudeKey(localStorage.getItem("notebookllm:claudeKey") ?? "");
      setGeminiKey(localStorage.getItem("notebookllm:geminiKey") ?? "");
      const savedTheme = localStorage.getItem("notebookllm:theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
        document.documentElement.classList.toggle("dark", savedTheme === "dark");
      }
    } catch {
      // ignore storage issues
    }
  }, []);

  function saveKeys() {
    try {
      localStorage.setItem("notebookllm:openaiKey", openAiKey.trim());
      localStorage.setItem("notebookllm:claudeKey", claudeKey.trim());
      localStorage.setItem("notebookllm:geminiKey", geminiKey.trim());
    } catch {
      // ignore storage issues
    }
  }

  function handleThemeChange(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    try {
      localStorage.setItem("notebookllm:theme", nextTheme);
    } catch {
      // ignore storage issues
    }
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />

      <main className="mx-auto max-w-[min(100%,96rem)] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Manage AI provider keys and appearance preferences.
        </p>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">AI Model Keys</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add provider keys to use model-based generation.
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="openai-key" className="text-sm font-medium">
                  OpenAI key
                </label>
                <input
                  id="openai-key"
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="claude-key" className="text-sm font-medium">
                  Claude key
                </label>
                <input
                  id="claude-key"
                  type="password"
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="claude-api-key..."
                  autoComplete="off"
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="gemini-key" className="text-sm font-medium">
                  Gemini key
                </label>
                <input
                  id="gemini-key"
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="gemini-api-key..."
                  autoComplete="off"
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <div className="mt-5">
              <Button type="button" onClick={saveKeys}>
                Save API keys
              </Button>
            </div>
          </div>

          <aside className="rounded-xl bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Theme</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose app appearance.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
              <div className="text-sm text-muted-foreground">Dark mode</div>
              <button
                type="button"
                role="switch"
                aria-checked={theme === "dark"}
                aria-label="Toggle dark mode"
                onClick={() =>
                  handleThemeChange(theme === "dark" ? "light" : "dark")
                }
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  theme === "dark" ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`inline-block size-5 transform rounded-full bg-background shadow transition-transform ${
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
              Current theme: <span className="font-medium text-foreground">{theme}</span>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

