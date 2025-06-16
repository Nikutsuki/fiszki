/**
 * Study Session page - conducts a study session for a specific study set
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navigation from "../../components/Navigation.js";
import QuizInterface from "../../components/QuizInterface.js";
import useStudySets from "../../hooks/useStudySets.js";
import useSessions from "../../hooks/useSessions.js";
import { useAuth } from "../../hooks/useAuth.js";

export default function StudySession() {
  const router = useRouter();
  const params = useParams();
  const { getStudySet, loading: studySetsLoading } = useStudySets();
  const {
    currentSession,
    startSession,
    answerQuestion,
    completeSession,
    abandonSession,
    loading: sessionsLoading,
    error: sessionError,
  } = useSessions();
  const { currentUser, loading: authLoading } = useAuth();

  const [studySet, setStudySet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionOptions, setSessionOptions] = useState({
    shuffleQuestions: false,
    shuffleAnswers: false,
    questionLimit: null,
  });
  const [showOptions, setShowOptions] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Load study set
  useEffect(() => {
    if (params.id && !studySetsLoading && !authLoading && currentUser) {
      const foundStudySet = getStudySet(params.id);
      if (foundStudySet) {
        setStudySet(foundStudySet);
      } else {
        setError("Study set not found");
      }
      setLoading(false);
    } else if (studySetsLoading || authLoading) {
      setLoading(true);
    }
  }, [params.id, getStudySet, studySetsLoading, authLoading, currentUser]);

  const handleStartSession = async () => {
    if (!studySet || isStarting) return;

    setIsStarting(true);
    setError(null);

    try {
      const result = await startSession(studySet, sessionOptions);

      if (result.success) {
        setShowOptions(false);
      } else {
        setError(result.error || "Failed to start session");
      }
    } catch (err) {
      setError("Failed to start session");
    } finally {
      setIsStarting(false);
    }
  };

  const handleAnswerQuestion = async (questionIndex, answerIndex) => {
    try {
      return await answerQuestion(questionIndex, answerIndex);
    } catch (err) {
      console.error("Failed to answer question:", err);
      return { success: false, error: "Failed to save answer" };
    }
  };

  const handleCompleteSession = async () => {
    try {
      const result = await completeSession();

      if (result.success) {
        // Redirect to session report
        router.push(`/report/${result.session.id}`);
      }

      return result;
    } catch (err) {
      console.error("Failed to complete session:", err);
      return { success: false, error: "Failed to complete session" };
    }
  };

  const handleAbandonSession = async () => {
    try {
      const result = await abandonSession();

      if (result.success) {
        router.push("/");
      }

      return result;
    } catch (err) {
      console.error("Failed to abandon session:", err);
      return { success: false, error: "Failed to abandon session" };
    }
  };

  if (loading || sessionsLoading || authLoading) {
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
                <div className="mt-4">
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

  if (!studySet) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              Study set not found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              The study set you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Show session options before starting */}
        {showOptions && !currentSession && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {studySet.name}
              </h1>
              {studySet.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {studySet.description}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {studySet.questions.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Questions
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {studySet.stats.averageScore}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Avg Score
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {studySet.stats.totalSessions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Sessions
                  </div>
                </div>
              </div>
            </div>

            {/* Session Options */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Session Options
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Shuffle Questions
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Present questions in random order
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sessionOptions.shuffleQuestions}
                    onChange={(e) =>
                      setSessionOptions({
                        ...sessionOptions,
                        shuffleQuestions: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Shuffle Answers
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Randomize answer order for each question
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sessionOptions.shuffleAnswers}
                    onChange={(e) =>
                      setSessionOptions({
                        ...sessionOptions,
                        shuffleAnswers: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Question Limit
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Limit the number of questions (leave empty for all)
                  </p>
                  <input
                    type="number"
                    min="1"
                    max={studySet.questions.length}
                    value={sessionOptions.questionLimit || ""}
                    onChange={(e) =>
                      setSessionOptions({
                        ...sessionOptions,
                        questionLimit: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                    placeholder={`Max ${studySet.questions.length}`}
                  />
                </div>
              </div>
            </div>

            {/* Session Error */}
            {sessionError && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {sessionError}
                </p>
              </div>
            )}

            {/* Start Session Button */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => router.push("/")}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  ← Back to Study Sets
                </button>

                <button
                  onClick={handleStartSession}
                  disabled={
                    isStarting ||
                    studySet.questions.length === 0 ||
                    (sessionOptions.questionLimit &&
                      sessionOptions.questionLimit < 1)
                  }
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isStarting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Starting Session...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🎓</span>
                      Start Study Session
                    </>
                  )}
                </button>
              </div>

              {studySet.questions.length === 0 && (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                  This study set has no questions. Please add questions before
                  starting a session.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Show quiz interface during session */}
        {currentSession && !showOptions && (
          <QuizInterface
            session={currentSession}
            onAnswerQuestion={handleAnswerQuestion}
            onCompleteSession={handleCompleteSession}
            onAbandonSession={handleAbandonSession}
          />
        )}
      </div>
    </div>
  );
}
