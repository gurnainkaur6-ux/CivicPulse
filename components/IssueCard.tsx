import { Issue, ISSUE_CATEGORIES, ISSUE_STATUS_COLORS } from "@/types";
import { formatDistance, formatRelativeTime } from "@/lib/utils";
import { ThumbsUp, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface IssueCardProps {
  issue: Issue & { distance_meters?: number };
  onUpvote?: (issueId: string) => void;
  isUpvoted?: boolean;
  showDistance?: boolean;
}

export function IssueCard({ issue, onUpvote, isUpvoted, showDistance = true }: IssueCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition p-4 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link href={`/issues/${issue.id}`} className="hover:text-blue-600 transition">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
              {issue.title}
            </h3>
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
            {issue.description}
          </p>
        </div>
        <Badge className={ISSUE_STATUS_COLORS[issue.status]}>
          {issue.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Photo */}
      {issue.photo_url && (
        <img
          src={issue.photo_url}
          alt={issue.title}
          className="w-full h-48 object-cover rounded-lg mb-3"
        />
      )}

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          <span>{ISSUE_CATEGORIES[issue.category]}</span>
        </div>
        {showDistance && issue.distance_meters !== undefined && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{formatDistance(issue.distance_meters)}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{formatRelativeTime(new Date(issue.created_at))}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant={isUpvoted ? "default" : "outline"}
          size="sm"
          onClick={() => onUpvote?.(issue.id)}
          className="gap-1"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>{issue.upvote_count}</span>
        </Button>

        <Link href={`/issues/${issue.id}`}>
          <Button variant="ghost" size="sm">
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
}
