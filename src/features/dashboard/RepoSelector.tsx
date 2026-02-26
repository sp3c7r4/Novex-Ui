import { useEffect, useRef, useCallback } from "react";
import { Check, Loader2, GitBranch } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGitHubRepos } from "@/hooks/useGitHubRepos";
import { Button } from "@/components/ui/button";
import type { GitHubRepo } from "@/types";

interface RepoSelectorProps {
  selectedRepo: GitHubRepo | null;
  onSelect: (repo: GitHubRepo) => void;
}

export function RepoSelector({ selectedRepo, onSelect }: RepoSelectorProps) {
  const { repos, loading, hasMore, fetchRepos, loadMore } = useGitHubRepos();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchRepos(1, false);
  }, [fetchRepos]);

  const setSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      sentinelRef.current = node;

      if (node && hasMore && !loading) {
        observerRef.current = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) loadMore();
          },
          { threshold: 0.1 }
        );
        observerRef.current.observe(node);
      }
    },
    [hasMore, loading, loadMore]
  );

  return (
    <Command className="w-full overflow-hidden rounded-lg border border-border/50">
      <CommandInput placeholder="Search repositories…" />
      <CommandList className="max-h-[260px]">
        <CommandEmpty className="py-8 text-[13px]">
          {loading ? "Loading…" : "No repositories found."}
        </CommandEmpty>
        <CommandGroup>
          {repos.map((repo) => (
            <CommandItem
              key={repo.full_name}
              value={repo.full_name}
              onSelect={() => onSelect(repo)}
              className="flex items-center gap-3 py-2.5"
            >
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="truncate text-[13px] font-medium">
                    {repo.full_name}
                  </span>
                  {repo.language && (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {repo.language}
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {repo.description}
                  </p>
                )}
              </div>
              {selectedRepo?.full_name === repo.full_name && (
                <Check className="h-4 w-4 shrink-0 text-foreground" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Infinite scroll sentinel / load more */}
        {hasMore && (
          <div ref={setSentinelRef} className="p-2 text-center">
            {loading ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                className="w-full text-xs text-muted-foreground"
              >
                Load more repositories
              </Button>
            )}
          </div>
        )}
      </CommandList>
    </Command>
  );
}
