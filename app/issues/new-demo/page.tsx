"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Upload, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IssueCategory, ISSUE_CATEGORIES } from "@/types";
import { getCurrentLocation } from "@/lib/utils";
import { toast } from "sonner";

// DEMO VERSION - Works without Appwrite setup
export default function NewIssueDemoPage() {
  const router = useRouter();
  const [category, setCategory] = useState<IssueCategory>("pothole");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCurrentLocation()
      .then((loc) => {
        setLocation(loc);
        setLoadingLocation(false);
      })
      .catch(() => {
        // Use default location if GPS fails
        const defaultLocation = { latitude: 30.9010, longitude: 75.8573 }; // Ludhiana
        setLocation(defaultLocation);
        setLoadingLocation(false);
        toast.info("Using default location (Ludhiana)");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      toast.error("Location is required");
      return;
    }

    setSubmitting(true);

    try {
      // Call demo API
      const response = await fetch("/api/issues/create-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          title,
          description,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("✅ Demo Issue Created! (Not saved - setup database to persist)");
        console.log("Created issue:", data.issue);
        
        // Show success and redirect
        setTimeout(() => {
          router.push("/issues");
        }, 2000);
      } else {
        toast.error(data.error || "Failed to create issue");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Network error. Check if dev server is running.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <MapPin className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CivicPulse</h1>
            </Link>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm font-medium rounded">
                DEMO MODE
              </span>
              <Link href="/issues">
                <Button variant="ghost">Cancel</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
        <div className="container mx-auto px-4 py-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            🎯 <strong>Demo Mode:</strong> Issues will not be saved. Setup database connections to persist data.
          </p>
        </div>
      </div>

      {/* Form */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Report an Issue / शिकायत दर्ज करें
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Help improve your neighborhood by reporting civic issues
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Category / श्रेणी *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(ISSUE_CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key as IssueCategory)}
                  className={`p-3 rounded-lg border-2 transition ${
                    category === key
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title / शीर्षक *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              required
              maxLength={255}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{title.length}/255</p>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description / विवरण *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about the issue"
              required
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* Location */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Location *
            </label>
            {loadingLocation ? (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Getting your location...</span>
              </div>
            ) : location ? (
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">Location captured</p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)} (±100m precision)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-200">Location access denied</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Using default location (Ludhiana)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={submitting || !location || !title || !description}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit / भेजें"
              )}
            </Button>
            <Link href="/issues" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel / रद्द करें
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
