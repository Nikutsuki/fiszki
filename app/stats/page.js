"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "../components/Navigation.js";
import { useAuth } from "../hooks/useAuth.js";

export default function StatsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const response = await fetch("/api/auth/stats", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data);
          } else {
            setError(data.error || "Failed to load statistics");
          }
        } else {
          setError("Failed to load statistics");
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Your Statistics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your learning progress and achievements.
          </p>
        </div>

        {stats && (
          <>
            {/* Overall Statistics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Overall Progress
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.overallStats.totalStudySets}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Study Sets
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.overallStats.totalSessions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Total Sessions
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.overallStats.averageScore}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Average Score
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.overallStats.bestOverallScore}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Best Score
                  </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {formatTime(stats.overallStats.totalTimeSpent)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Total Time
                  </div>
                </div>
              </div>
            </div>

            {/* Study Set Statistics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Study Set Progress
              </h2>
              {stats.user.progress.studySets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Study Set
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Sessions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Avg Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Best Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Time Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Last Attempt
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {stats.user.progress.studySets.map((studySet) => (
                        <tr key={studySet.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {studySet.id.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {studySet.totalSessions || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {studySet.averageScore || 0}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {studySet.bestScore || 0}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {formatTime(studySet.totalTimeSpent || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {studySet.lastAttempt 
                              ? new Date(studySet.lastAttempt).toLocaleDateString()
                              : "Never"
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">
                    No study sessions completed yet. Start a study session to see your progress here!
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            ← Back to Study Sets
          </button>
        </div>
      </div>
    </div>
  );
}
