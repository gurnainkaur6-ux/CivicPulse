import Link from "next/link";
import { MapPin, TrendingUp, Users, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CivicPulse</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/issues" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition">
              Browse Issues
            </Link>
            <Link href="/stats" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition">
              Stats
            </Link>
            <Link href="/auth/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Your Voice for a Better Neighborhood
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Report potholes, water problems, power outages, and more. See what&apos;s happening around you in real-time.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/issues/new"
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg"
            >
              Report an Issue
            </Link>
            <Link
              href="/issues"
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-lg border"
            >
              View Map
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <FeatureCard
            icon={<MapPin className="w-10 h-10 text-blue-600" />}
            title="Location-Based"
            description="Find issues within 1km, 3km, or 5km radius of your location"
          />
          <FeatureCard
            icon={<TrendingUp className="w-10 h-10 text-green-600" />}
            title="Live Updates"
            description="Real-time notifications when issues are updated or resolved"
          />
          <FeatureCard
            icon={<Users className="w-10 h-10 text-purple-600" />}
            title="Community Upvotes"
            description="Vote on issues to show they affect you too"
          />
          <FeatureCard
            icon={<Clock className="w-10 h-10 text-orange-600" />}
            title="Track Progress"
            description="See status changes from reported to resolved"
          />
        </div>

        {/* How it Works */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Step
              number="1"
              title="Report"
              description="Spot a problem? Take a photo, drop a pin, and describe the issue."
            />
            <Step
              number="2"
              title="Upvote"
              description="See the same problem? Upvote existing reports instead of duplicating."
            />
            <Step
              number="3"
              title="Track"
              description="Watch as authorities acknowledge and resolve issues in your area."
            />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to make a difference?
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join your neighbors in building a better community.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg"
          >
            Get Started
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 dark:bg-gray-900 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>Built with Appwrite TablesDB • Next.js 15</p>
          <p className="text-sm mt-2">Appwrite Databases Hackathon 2026</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
