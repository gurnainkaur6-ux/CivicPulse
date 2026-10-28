"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, TrendingUp, Clock, CheckCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ISSUE_CATEGORIES } from "@/types";
import type { AreaStats, IssueStats } from "@/types";
import { toast } from "sonner";

export default function StatsPage() {
  const [categoryStats, setCategoryStats] = useState<AreaStats[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stats");
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setCategoryStats(data.category_stats ?? []);
      } else {
        toast.error(data.error || "Failed to load statistics");
      }
    } catch {
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const total = stats?.total ?? 0;
  const resolved = stats?.resolved ?? 0;
  const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : "0.0";
  const avgHours = stats?.avg_resolution_hours ?? 0;

  const topCategory = categoryStats[0];
  const fastestCategory = [...categoryStats]
    .filter((entry) => entry.resolved_issues > 0)
    .sort((a, b) => a.avg_resolution_hours - b.avg_resolution_hours)[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <MapPin className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CivicPulse</h1>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/issues">
                <Button variant="ghost">Browse Issues</Button>
              </Link>
              <Link href="/issues/new">
                <Button>Report Issue</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            <BarChart3 className="w-12 h-12 inline-block mb-2 text-blue-600" />
            <br />
            Community Impact Dashboard
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Live statistics from the TablesDB issues table
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading statistics...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <StatCard
                icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
                title="Total Issues Reported"
                value={total.toString()}
                subtitle={`${stats?.issues_today ?? 0} reported today`}
                color="blue"
              />
              <StatCard
                icon={<CheckCircle className="w-8 h-8 text-green-600" />}
                title="Issues Resolved"
                value={`${resolutionRate}%`}
                subtitle={`${resolved} of ${total} resolved`}
                color="green"
              />
              <StatCard
                icon={<Clock className="w-8 h-8 text-purple-600" />}
                title="Avg Resolution Time"
                value={avgHours > 0 ? `${Math.round(avgHours)}h` : "N/A"}
                subtitle={avgHours > 0 ? `${(avgHours / 24).toFixed(1)} days average` : "Not enough data"}
                color="purple"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-12">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Issues by Category</h3>
              {categoryStats.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">
                  No issues yet. <Link href="/issues/new" className="text-blue-600 underline">Report the first one</Link>.
                </p>
              ) : (
                <div className="space-y-6">
                  {categoryStats.map((stat) => (
                    <CategoryStatRow key={stat.category} stat={stat} />
                  ))}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold mb-4">Top Reported Category</h3>
                {topCategory ? (
                  <>
                    <p className="text-lg opacity-90 mb-2">
                      <strong>{ISSUE_CATEGORIES[topCategory.category] ?? topCategory.category}</strong> leads the board
                    </p>
                    <p className="text-sm opacity-75">
                      {topCategory.total_issues} reports · {topCategory.resolution_rate}% resolved
                    </p>
                  </>
                ) : (
                  <p className="text-sm opacity-75">Waiting for the first report</p>
                )}
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold mb-4">Fastest Response</h3>
                {fastestCategory ? (
                  <>
                    <p className="text-lg opacity-90 mb-2">
                      <strong>{ISSUE_CATEGORIES[fastestCategory.category] ?? fastestCategory.category}</strong> gets resolved quickest
                    </p>
                    <p className="text-sm opacity-75">
                      {Math.round(fastestCategory.avg_resolution_hours)} hours average to resolution
                    </p>
                  </>
                ) : (
                  <p className="text-sm opacity-75">Not enough resolved issues yet</p>
                )}
              </div>
            </div>

            <div className="mt-12 text-center">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  See an issue in your area?
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  Your report helps prioritize civic improvements and holds authorities accountable.
                </p>
                <Link href="/issues/new">
                  <Button size="lg" className="text-lg px-8 py-6">
                    Report an Issue Now
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="border-t bg-gray-50 dark:bg-gray-900 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>Built with Appwrite TablesDB · Next.js 15</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "green" | "purple";
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
  }[color];

  return (
    <div className={`bg-gradient-to-br ${colorClasses} text-white rounded-2xl shadow-xl p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className="bg-white/20 rounded-lg p-3">{icon}</div>
      </div>
      <h3 className="text-lg font-medium opacity-90 mb-2">{title}</h3>
      <p className="text-4xl font-bold mb-1">{value}</p>
      <p className="text-sm opacity-75">{subtitle}</p>
    </div>
  );
}

function CategoryStatRow({ stat }: { stat: AreaStats }) {
  const label = ISSUE_CATEGORIES[stat.category] ?? stat.category;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">{label}</h4>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {stat.total_issues} reports · {stat.resolved_issues} resolved
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-700 dark:text-gray-300 font-medium">{stat.resolution_rate}%</span>
          <span className="text-gray-600 dark:text-gray-400">
            {stat.avg_resolution_hours > 0 ? `${Math.round(stat.avg_resolution_hours / 24)}d avg` : "—"}
          </span>
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${stat.resolution_rate}%` }}
        />
      </div>
    </div>
  );
}
