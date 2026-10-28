"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, AlertCircle, CheckCircle, Clock, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  total: number;
  reported: number;
  acknowledged: number;
  in_progress: number;
  resolved: number;
  avg_resolution_hours: number;
  issues_today: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        setError("Admin sign-in required. Sign in with an admin account, or add your email to ADMIN_EMAILS.");
        return;
      }

      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || "Failed to load stats");
      }
    } catch (err) {
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">CivicPulse Admin</h1>
            </div>
            <div className="flex gap-4">
              <Link href="/">
                <Button variant="ghost">Public Site</Button>
              </Link>
              <Link href="/auth/login?redirect=/admin">
                <Button variant="outline">Sign in</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Issues */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Issues</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.total || 0}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {stats?.reported || 0}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-purple-600">
                  {(stats?.acknowledged || 0) + (stats?.in_progress || 0)}
                </p>
              </div>
              <Clock className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          {/* Resolved */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Resolved</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats?.resolved || 0}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Issues Today</h3>
            <p className="text-4xl font-bold text-blue-600">{stats?.issues_today || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Avg Resolution Time</h3>
            <p className="text-4xl font-bold text-blue-600">
              {stats?.avg_resolution_hours ? 
                `${Math.round(stats.avg_resolution_hours)}h` : 
                'N/A'
              }
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/issues">
              <Button className="w-full" size="lg">
                Manage All Issues
              </Button>
            </Link>
            <Link href="/admin/issues?status=reported">
              <Button variant="outline" className="w-full" size="lg">
                View Pending Issues
              </Button>
            </Link>
            <Link href="/stats">
              <Button variant="outline" className="w-full" size="lg">
                View Analytics
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
