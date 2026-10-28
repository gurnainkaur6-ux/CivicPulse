"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, ThumbsUp, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Issue, StatusEvent, ISSUE_CATEGORIES, ISSUE_STATUS_COLORS } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

type IssueWithHistory = Issue & { status_history: StatusEvent[] };

export default function IssueDetailPage() {
  const params = useParams();
  const issueId = params.id as string;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [timeline, setTimeline] = useState<StatusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [isUpvoted, setIsUpvoted] = useState(false);

  const fetchIssue = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/issues/${issueId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotFound(true);
        return;
      }

      const loaded = data.issue as IssueWithHistory;
      setIssue(loaded);
      setTimeline(loaded.status_history ?? []);

      // Only signed-in users can have voted.
      const upvoteResponse = await fetch(`/api/issues/upvote?issue_id=${issueId}`);
      if (upvoteResponse.ok) {
        const upvoteData = await upvoteResponse.json();
        setIsUpvoted(Boolean(upvoteData.has_upvoted));
      }
    } catch (error) {
      toast.error("Failed to load issue");
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  const handleUpvote = async () => {
    setUpvoting(true);
    try {
      const response = await fetch("/api/issues/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_id: issueId }),
      });

      if (response.status === 401) {
        toast.error("Please sign in to upvote");
        return;
      }

      const data = await response.json();

      if (data.success && issue) {
        setIsUpvoted(data.action === "added");
        setIssue({ ...issue, upvote_count: data.upvote_count });
        toast.success(data.action === "added" ? "Upvote added" : "Upvote removed");
      } else {
        toast.error(data.error || "Failed to toggle upvote");
      }
    } catch (error) {
      toast.error("Failed to toggle upvote");
    } finally {
      setUpvoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (notFound || !issue) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Issue not found</h2>
          <Link href="/issues">
            <Button>Back to Issues</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/issues">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <MapPin className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CivicPulse</h1>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {issue.photo_url && (
            <img src={issue.photo_url} alt={issue.title} className="w-full h-96 object-cover" />
          )}

          <div className="p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={ISSUE_STATUS_COLORS[issue.status]}>
                    {issue.status.replace("_", " ")}
                  </Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {ISSUE_CATEGORIES[issue.category] ?? issue.category}
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{issue.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Reported {formatRelativeTime(new Date(issue.created_at))}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
                {issue.address && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{issue.address}</p>
                )}
              </div>

              <Button
                onClick={handleUpvote}
                disabled={upvoting}
                variant={isUpvoted ? "default" : "outline"}
                className="gap-2"
              >
                <ThumbsUp className="w-5 h-5" />
                <span className="font-bold text-lg">{issue.upvote_count}</span>
              </Button>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{issue.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status Timeline</h3>
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No status changes yet — the report is waiting for an authority to review it.
                </p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        {index < timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-600 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <Badge className={ISSUE_STATUS_COLORS[event.new_status]}>
                              {event.new_status.replace("_", " ")}
                            </Badge>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatRelativeTime(new Date(event.created_at))}
                            </span>
                          </div>
                          {event.notes && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{event.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Link href="/issues" className="flex-1">
            <Button variant="outline" className="w-full">
              Back to Issues
            </Button>
          </Link>
          <Button
            variant="outline"
            className="flex-1"
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied");
            }}
          >
            Share
          </Button>
        </div>
      </main>
    </div>
  );
}
