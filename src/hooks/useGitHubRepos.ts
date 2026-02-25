import { useState, useCallback } from "react";
import api from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import type { GitHubRepo } from "@/types";

interface UseGitHubReposOptions {
  perPage?: number;
}

export function useGitHubRepos({ perPage = 20 }: UseGitHubReposOptions = {}) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { auth } = useAppStore();

  const fetchRepos = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!auth.token) return;

      setLoading(true);
      try {
        // After interceptor unwrap, data is the inner payload:
        // Could be { message, data: [...repos] } or directly [...repos]
        const { data } = await api.get("/auth/github/repos", {
          params: { page: pageNum, per_page: perPage },
        });

        const fetched: GitHubRepo[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : data?.repos ?? [];

        setRepos((prev) => (append ? [...prev, ...fetched] : fetched));
        setHasMore(fetched.length >= perPage);
        setPage(pageNum);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to fetch repositories"
        );
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [auth.token, perPage]
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) fetchRepos(page + 1, true);
  }, [loading, hasMore, page, fetchRepos]);

  return { repos, loading, hasMore, fetchRepos, loadMore };
}
