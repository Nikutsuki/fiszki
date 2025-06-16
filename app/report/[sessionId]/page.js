/**
 * Session Report page - displays detailed results and statistics for a completed study session
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navigation from "../../components/Navigation.js";
import SessionReport from "../../components/SessionReport.js";
import useStudySets from "../../hooks/useStudySets.js";
import useSessions from "../../hooks/useSessions.js";

export default function SessionReportPage() {
  const router = useRouter();
  const params = useParams();
  const { getStudySet } = useStudySets();
  const { getSession, startSession, loading: sessionsLoading } = useSessions();

  const [session, setSession] = useState(null);
  const [studySet, setStudySet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load session and study set data
  useEffect(() => {
    if (params.sessionId && !sessionsLoading) {
      const foundSession = getSession(params.sessionId);

      if (foundSession) {
        setSession(foundSession);
        setError(null);

        // Load the associated study set
        const associatedStudySet = getStudySet(foundSession.studySetId);
        if (associatedStudySet) {
          setStudySet(associatedStudySet);
        } else {
          console.warn(
            `Study set ${foundSession.studySetId} not found for session ${foundSession.id}`,
          );
        }
      } else if (retryCount < 3) {
        // Retry loading the session up to 3 times
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
        }, 1000);
        return;
      } else {
        setError(
          "Session not found. The session may have been deleted or the link is invalid.",
        );
      }

      setLoading(false);
    }
  }, [params.sessionId, getSession, getStudySet, sessionsLoading, retryCount]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryCount(0);
  };

  const handleRetakeSession = async () => {
    if (!studySet) return;

    try {
      // Start a new session with the same study set
      const result = await startSession(studySet, {
        shuffleQuestions: false,
        shuffleAnswers: false,
        questionLimit: null,
      });

      if (result.success) {
        router.push(`/study/${studySet.id}`);
      } else {
        setError("Failed to start new session");
      }
    } catch (err) {
      setError("Failed to start new session");
    }
  };

  if (loading || sessionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400 dark:text-red-300"
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
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
                <div className="mt-4 space-x-3">
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors"
                  >
                    Return Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              Session not found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              The session report you&apos;re looking for doesn&apos;t exist or
              has been removed. This might happen if the session wasn&apos;t
              properly saved or if your browser data was cleared.
            </p>
            <div className="space-x-3">
              <button
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SessionReport
          session={session}
          studySet={studySet}
          onRetakeSession={studySet ? handleRetakeSession : undefined}
        />
      </div>
    </div>
  );
}
