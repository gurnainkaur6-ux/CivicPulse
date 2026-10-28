'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES } from '@/types';
import type { IssueCategory, IssuePriority, SimilarIssue } from '@/types';

export default function NewIssuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [similar, setSimilar] = useState<SimilarIssue[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'pothole' as IssueCategory,
    priority: 'medium' as IssuePriority,
    address: '',
    latitude: 30.901,
    longitude: 75.8573,
  });

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/auth/login?redirect=/issues/new');
        return;
      }

      setCheckingAuth(false);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFormData((prev) => ({
              ...prev,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }));
          },
          () => {
            // Keep the default location when permission is denied.
          }
        );
      }
    }
    checkAuth();
  }, [router]);

  // Duplicate detection: ask the API for similar nearby issues while typing.
  useEffect(() => {
    if (formData.title.trim().length < 10) {
      setSimilar([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/issues/similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || formData.title,
            category: formData.category,
            latitude: formData.latitude,
            longitude: formData.longitude,
            radius_km: 2,
          }),
        });
        const data = await response.json();
        setSimilar(data.success ? data.similar_issues : []);
      } catch {
        setSimilar([]);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [formData.title, formData.description, formData.category, formData.latitude, formData.longitude]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/issues/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          address: formData.address || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push('/auth/login?redirect=/issues/new');
        return;
      }

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to create issue. Please try again.');
        setLoading(false);
        return;
      }

      router.push(`/issues/${data.issue.id}`);
    } catch (err) {
      console.error('Failed to create issue:', err);
      setError('Failed to create issue. Please try again.');
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
            ← Back to Home
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Report a Civic Issue</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Help improve your community by reporting issues that need attention.
          </p>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Duplicate detection */}
          {similar.length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-semibold text-amber-900 mb-2">
                Someone may have already reported this — upvote instead of duplicating
              </p>
              <ul className="space-y-2">
                {similar.map((issue) => (
                  <li key={issue.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/issues/${issue.id}`}
                      className="text-amber-900 underline underline-offset-2 truncate"
                    >
                      {issue.title}
                    </Link>
                    <span className="shrink-0 text-amber-700">
                      {issue.distance_meters}m away · {issue.upvote_count} upvotes
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Title *
              </label>
              <input
                type="text"
                id="title"
                required
                minLength={10}
                maxLength={120}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Large pothole on Main Street"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as IssueCategory })}
                >
                  {Object.entries(ISSUE_CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority *
                </label>
                <div className="flex gap-2">
                  {Object.entries(ISSUE_PRIORITIES).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: value as IssuePriority })}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                        formData.priority === value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                required
                minLength={20}
                maxLength={2000}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="Describe the issue in detail (at least 20 characters)..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">{formData.description.trim().length}/20 characters</p>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location / Landmark
              </label>
              <input
                type="text"
                id="address"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Main Street near City Hall, Bathinda"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <p className="mt-1 text-sm text-gray-500">
                Coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                We detected your location automatically. Adjust the coordinates if needed.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
              >
                {loading ? 'Submitting...' : 'Submit Issue'}
              </button>
              <Link
                href="/"
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition font-semibold dark:text-white"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
