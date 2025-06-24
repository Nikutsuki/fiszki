"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "./components/Navigation.js";
import StudySetCard from "./components/StudySetCard.js";
import useStudySets from "./hooks/useStudySets.js";
import { initializeStorage } from "./lib/storage.js";
import { useAuth } from "./hooks/useAuth.js";

export default function Home() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const { studySets, loading, error, clearError } = useStudySets();

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSets, setFilteredSets] = useState([]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, authLoading, router]);

  // Initialize storage on mount
  useEffect(() => {
    initializeStorage();
  }, []);
  // Update filtered sets when studySets or search changes
  useEffect(() => {
    let sets = studySets;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      sets = studySets.filter((set) =>
        set.name.toLowerCase().includes(lowerQuery),
      );
    }
    setFilteredSets(sets);
  }, [studySets, searchQuery]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Or a loading spinner, or redirecting message
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Study Sets
          </h1>
          <p className="text-gray-600">
            Select a study set to begin your session.
          </p>
        </div>
        {/* Search */}
        {studySets.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search study sets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setSearchQuery("")}
                >
                  <svg
                    className="h-5 w-5 text-gray-400 hover:text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Study Sets Grid */}
        {filteredSets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSets.map((studySet) => (
              <StudySetCard
                key={studySet.id}
                studySet={studySet}
                showActions={true}
              />
            ))}
          </div>
        ) : studySets.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No study sets found
            </h3>
            <p className="text-gray-500 mb-6">
              Place your CSV files in the `public/study_sets` directory to see
              them here.
            </p>
          </div>
        ) : (
          // No Search Results
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search query.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setSearchQuery("")}
                className="block mx-auto px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Clear search
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
