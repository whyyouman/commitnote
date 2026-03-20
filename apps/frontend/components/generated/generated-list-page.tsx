"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppNavbar } from "@/components/app-navbar";
import { Button } from "@/components/ui/button";
import { GeneratedSection } from "@/lib/generated-content";

type GeneratedListPageProps = {
  section: GeneratedSection;
  noteId?: string;
};

export function GeneratedListPage({ section, noteId }: GeneratedListPageProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />
      <main className="mx-auto max-w-[min(100%,96rem)] px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{section.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/25">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">S. No</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Open</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }, (_, i) => (
                      <tr key={`generated-list-skeleton-${i}`}>
                        <td colSpan={5} className="px-4 py-3">
                          <div className="animate-pulse">
                            <div className="h-4 w-full rounded bg-muted" />
                          </div>
                        </td>
                      </tr>
                    ))
                  : section.entries.map((entry, index) => {
                      const nextHref = noteId
                        ? `${section.href}?note=${encodeURIComponent(noteId)}&id=${encodeURIComponent(entry.id)}`
                        : `${section.href}?id=${encodeURIComponent(entry.id)}`;

                      return (
                        <tr key={entry.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">{index + 1}</td>
                          <td className="px-4 py-3 font-medium">{entry.title}</td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.subtitle}</td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">
                            {entry.createdAt}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={nextHref}>
                              <Button type="button" variant="outline" size="sm">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
