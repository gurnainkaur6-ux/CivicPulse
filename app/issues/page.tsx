"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Filter, Plus, Search } from "lucide-react";
import { IssueCard } from "@/components/IssueCard";
import { Button } from "@/components/ui/button";
import { Issue, IssueCategory, IssueStatus, ISSUE_CATEGORIES } from "@/types";
import { getCurrentLocation } from "@/lib/utils";
import { toast } from "sonner";

export default function IssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(3);
  const [category, setCategory] = useState<IssueCategory | "">("");
  const [status, setStatus] = useState<IssueStatus | "">("");
  const [sortBy, setSortBy] = useState<"recent" | "upvotes">("recent");

  useEffect(() => {
    // Get user location
    getCurrentLocation()
      .then((loc) => {
        setLocation(loc);
        fetchIssues(loc.latitude, loc.longitude);
      })
      .catch(() => {
        // Fallback to Ludhiana center
        const fallback = { lat: 30.9010, lng: 75.8573 };
        setLocation(fallback);
        fetchIssues(fallback.lat, fallback.lng);
        toast.info("Using default location (Ludhiana)");
      });
  }, []);

  const fetchIssues = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        radius_km: radius.toString(),
        sort_by: sortBy,
      });

      if (category) params.append("category", category);
      if (status) params.append("status", status);

      const response = await fetch(`/api/issues/nearby?${params}`);
      const data = await response.json();

      if (data.success) {
        setIssues(data.issues);
      } else {
        toast.error("Failed to load issues");
      }
    } catch (error) {
      toast.error("Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location) {
      fetchIssues(location.lat, location.lng);
    }
  }, [radius, category, status, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <MapPin className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CivicPulse</h1>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/stats">
                <Button variant="ghost">Stats</Button>
              </Link>
              <Link href="/issues/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Report Issue
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-[73px] z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Radius */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Radius:</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              >
                <option value={1}>1 km</option>
                <option value={3}>3 km</option>
                <option value={5}>5 km</option>
              </select>
            </div>

            {/* Category */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory | "")}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              >
                <option value="">All</option>
                {Object.entries(ISSUE_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IssueStatus | "")}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              >
                <option value="">All</option>
                <option value="reported">Reported</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recent" | "upvotes")}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              >
                <option value="recent">Most Recent</option>
                <option value="upvotes">Most Upvoted</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading nearby issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No issues found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Be the first to report an issue in this area!
            </p>
            <Link href="/issues/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Report Issue
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {issues.length} {issues.length === 1 ? "Issue" : "Issues"} Nearby
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Within {radius}km of your location
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} showDistance />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
