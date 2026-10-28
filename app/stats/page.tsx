"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, TrendingUp, Clock, CheckCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ISSUE_CATEGORIES } from "@/types";
import { toast } from "sonner";

interface AreaStats {
  category: string;
  total_issues: number;
  resolved_issues: number;
  resolution_rate: number;
  avg_resolution_hours: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<AreaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIssues, setTotalIssues] = useState(0);
  const [resolvedIssues, setResolvedIssues] = useState(0);
  const [avgResolutionTime, setAvgResolutionTime] = useState(0);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual API call
      // TODO: Implement GET /api/stats
      const mockStats: AreaStats[] = [
        { category: "pothole", total_issues: 45, resolved_issues: 32, resolution_rate: 71, avg_resolution_hours: 72 },
        { category: "water", total_issues: 38, resolved_issues: 25, resolution_rate: 66, avg_resolution_hours: 96 },
        { category: "power", total_issues: 32, resolved_issues: 28, resolution_rate: 88, avg_resolution_hours: 48 },
        { category: "garbage", total_issues: 28, resolved_issues: 20, resolution_rate: 71, avg_resolution_hours: 120 },
        { category: "streetlight", total_issues: 22, resolved_issues: 18, resolution_rate: 82, avg_resolution_hours: 60 },
        { category: "drainage", total_issues: 18, resolved_issues: 12, resolution_rate: 67, avg_resolution_hours: 144 },
        { category: "road", total_issues: 15, resolved_issues: 10, resolution_rate: 67, avg_resolution_hours: 168 },
      ];

      setStats(mockStats);

      const total = mockStats.reduce((sum, s) => sum + s.total_issues, 0);
      const resolved = mockStats.reduce((sum, s) => sum + s.resolved_issues, 0);
      const avgTime = mockStats.reduce((sum, s) => sum + s.avg_resolution_hours, 0) / mockStats.length;

      setTotalIssues(total);
      setResolvedIssues(resolved);
      setAvgResolutionTime(avgTime);
    } catch (error) {
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const overallResolutionRate = totalIssues > 0 ? ((resolvedIssues / totalIssues) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
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

      {/* Hero Stats */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            <BarChart3 className="w-12 h-12 inline-block mb-2 text-blue-600" />
            <br />
            Community Impact Dashboard
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Real-time statistics for Ludhiana civic issues
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading statistics...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <StatCard
                icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
                title="Total Issues Reported"
                value={totalIssues.toString()}
                subtitle="All time"
                color="blue"
              />
              <StatCard
                icon={<CheckCircle className="w-8 h-8 text-green-600" />}
                title="Issues Resolved"
                value={`${overallResolutionRate}%`}
                subtitle={`${resolvedIssues} of ${totalIssues} resolved`}
                color="green"
              />
              <StatCard
                icon={<Clock className="w-8 h-8 text-purple-600" />}
                title="Avg Resolution Time"
                value={`${Math.round(avgResolutionTime)}h`}
                subtitle={`${(avgResolutionTime / 24).toFixed(1)} days average`}
                color="purple"
              />
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-12">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Issues by Category</h3>
              <div className="space-y-6">
                {stats.map((stat) => (
                  <CategoryStatRow key={stat.category} stat={stat} />
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold mb-4">🏆 Top Priority</h3>
                <p className="text-lg opacity-90 mb-2">
                  <strong>Potholes</strong> are the most reported issue
                </p>
                <p className="text-sm opacity-75">45 reports with 71% resolution rate</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold mb-4">⚡ Fastest Response</h3>
                <p className="text-lg opacity-90 mb-2">
                  <strong>Power Issues</strong> get resolved quickest
                </p>
                <p className="text-sm opacity-75">Average 48 hours (2 days) to resolution</p>
              </div>
            </div>

            {/* Call to Action */}
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

      {/* Footer */}
      <footer className="border-t bg-gray-50 dark:bg-gray-900 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>Built with Appwrite • PostgreSQL + PostGIS • MySQL • Next.js</p>
          <p className="text-sm mt-2">Empowering communities through transparency and accountability</p>
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
  color: string;
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
  const category = ISSUE_CATEGORIES[stat.category as keyof typeof ISSUE_CATEGORIES] || stat.category;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">{category}</h4>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {stat.total_issues} reports • {stat.resolved_issues} resolved
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-700 dark:text-gray-300 font-medium">{stat.resolution_rate}%</span>
          <span className="text-gray-600 dark:text-gray-400">
            {Math.round(stat.avg_resolution_hours / 24)}d avg
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
