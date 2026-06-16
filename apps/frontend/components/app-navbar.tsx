import Link from "next/link";
import { NotebookPen, Settings } from "lucide-react";

export function AppNavbar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[min(100%,96rem)] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/50">
            <NotebookPen className="size-4 text-foreground" aria-hidden />
          </span>
          <span className="hidden sm:inline">NotebookLLM</span>
        </Link>

        <Link
          href="/setting"
          className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </Link>
      </div>
    </header>
  );
}
