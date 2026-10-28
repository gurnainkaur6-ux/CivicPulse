"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Issue } from "@/types";

const STATUS_COLORS = {
  reported: "bg-yellow-100 text-yellow-800",
  acknowledged: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
};

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [filter, setFilter] = useState({ status: "", category: "", search: "" });
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchIssues();
  }, [filter, page]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(filter.status && { status: filter.status }),
        ...(filter.category && { category: filter.category }),
        ...(filter.search && { search: filter.search }),
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });

      const response = await fetch(`/api/admin/issues?${params}`);
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        setAuthError(
          "Admin sign-in required. Sign in with an admin account, or add your email to ADMIN_EMAILS."
        );
        return;
      }
      setAuthError("");

      if (data.success) {
        setIssues(data.issues);
      } else {
        console.error("Failed to fetch issues:", data.error);
      }
    } catch (err) {
      console.error("Failed to fetch issues:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/issues/${issueId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.status === 401 || response.status === 403) {
        setAuthError("Admin sign-in required to change status.");
        return;
      }

      if (response.ok) {
        setAuthError("");
        await fetchIssues(); // Refresh list
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status");
    }
  };

  const handleDelete = async (issueId: string) => {
    if (!confirm("Are you sure you want to delete this issue?")) return;

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "DELETE",
      });

      if (response.status === 401 || response.status === 403) {
        setAuthError("Admin sign-in required to delete issues.");
        return;
      }

      if (response.ok) {
        setAuthError("");
        await fetchIssues(); // Refresh list
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to delete issue");
      }
    } catch (err) {
      console.error("Failed to delete issue:", err);
      alert("Failed to delete issue");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <MapPin className="w-8 h-8 text-blue-600 cursor-pointer" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Manage Issues</h1>
            </div>
            <Link href="/admin">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b p-4">
        <div className="container mx-auto">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            {/* Category Filter */}
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Categories</option>
              <option value="pothole">Pothole</option>
              <option value="water">Water</option>
              <option value="power">Power</option>
              <option value="garbage">Garbage</option>
              <option value="streetlight">Streetlight</option>
              <option value="drainage">Drainage</option>
              <option value="road">Road</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issues Table */}
      <main className="container mx-auto px-4 py-8">
        {authError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {authError}
          </div>
        )}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No issues found</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Upvotes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {issue.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/issues/${issue.id}`} className="text-blue-600 hover:underline">
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm capitalize">{issue.category}</td>
                    <td className="px-6 py-4">
                      <select
                        value={issue.status}
                        onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[issue.status]}`}
                      >
                        <option value="reported">Reported</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm">{issue.upvote_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(issue.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(issue.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">Page {page + 1}</span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={issues.length < pageSize}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
