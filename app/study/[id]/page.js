/**
 * Study Session page - conducts a study session for a specific study set
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Navigation from "../../components/Navigation.js";
import QuizInterface from "../../components/QuizInterface.js";
import FlashcardInterface from "../../components/FlashcardInterface.js";
import useStudySets from "../../hooks/useStudySets.js";
import useSessions from "../../hooks/useSessions.js";
import { useAuth } from "../../hooks/useAuth.js";
import { flashcardStorage } from "../../lib/storage.js";
import { filterFlashcards, getFlashcardCounts } from "../../lib/utils.js";

export default function StudySession() {
  const router = useRouter();
  const params = useParams();
  const {
    getStudySet,
    loading: studySetsLoading,
    isReady: studySetsReady,
    loadStudySets,
  } = useStudySets();
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
  const [retryCount, setRetryCount] = useState(0);
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [flashcardStudyMode, setFlashcardStudyMode] = useState("all");
  const [knownCards, setKnownCards] = useState(new Set());
  const [unknownCards, setUnknownCards] = useState(new Set());
  const [totalCards, setTotalCards] = useState(0);

  // Retry function for loading study set
  const retryLoadStudySet = useCallback(async () => {
    setRetryCount((prev) => prev + 1);
    setError(null);
    setLoading(true);

    try {
      // Force reload of study sets from server
      await loadStudySets(true);

      // Try to get the study set again after reload
      setTimeout(() => {
        const foundStudySet = getStudySet(params.id);
        if (foundStudySet) {
          setStudySet(foundStudySet);
          setError(null);
        } else {
          setError("Study set not found");
        }
        setLoading(false);
      }, 100);
    } catch (err) {
      console.error("Retry failed:", err);
      setError("Failed to reload study sets");
      setLoading(false);
    }
  }, [params.id, getStudySet, loadStudySets]);

  // Load study set
  useEffect(() => {
    // Only try to load study set when both auth and study sets are ready
    if (params.id && !authLoading && currentUser && studySetsReady) {
      const foundStudySet = getStudySet(params.id);

      if (foundStudySet) {
        setStudySet(foundStudySet);

        // Detect if this is a flashcard study set
        const hasFlashcards = foundStudySet.questions.some(
          (q) => q.type === "flashcard",
        );
        setIsFlashcardMode(hasFlashcards);

        // Calculate known/unknown cards for flashcard mode
        if (hasFlashcards) {
          const progress = currentUser?.flashcardProgress?.[foundStudySet.id] ?? {
            knownCards: [],
            unknownCards: [],
          };
          const counts = getFlashcardCounts(foundStudySet.questions, progress);
          
          const known = new Set(progress.knownCards);
          const unknown = new Set();
          
          foundStudySet.questions.forEach((question) => {
            if (!progress.knownCards.includes(question.id) && !progress.unknownCards.includes(question.id)) {
              unknown.add(question.id);
            } else if (progress.unknownCards.includes(question.id)) {
              unknown.add(question.id);
            }
          });
          
          setKnownCards(known);
          setUnknownCards(unknown);
        }
        
        setTotalCards(foundStudySet.questions.length);

        setError(null); // Clear any previous errors
        setLoading(false);
      } else {
        // Set error immediately when study sets are ready but study set not found
        setError("Study set not found");
        setLoading(false);
      }
    } else if (authLoading || studySetsLoading || !studySetsReady) {
      // Show loading when auth is loading, study sets are loading, or study sets aren't ready yet
      setLoading(true);
      setError(null); // Clear errors when loading
    } else if (!currentUser) {
      // Handle case where user is not authenticated
      setError("Please log in to access study sets");
      setLoading(false);
    }
  }, [
    params.id,
    getStudySet,
    studySetsLoading,
    authLoading,
    currentUser,
    studySetsReady,
  ]);

  // Helper function to get filtered questions count
  const getFilteredQuestionsCount = () => {
    let questions = studySet?.questions || [];
    if (isFlashcardMode && studySet) {
      const progress = currentUser?.flashcardProgress?.[studySet.id] ?? {
        knownCards: [],
        unknownCards: [],
      };
      if (flashcardStudyMode === "known") {
        questions = questions.filter(q => progress.knownCards.includes(q.id));
      } else if (flashcardStudyMode === "unknown") {
        questions = questions.filter(
          q =>
            progress.unknownCards.includes(q.id) ||
            (!progress.knownCards.includes(q.id) &&
             !progress.unknownCards.includes(q.id))
        );
      }
    }
    return questions.length;
  };

  const handleStartSession = async () => {
    if (!studySet || isStarting) return;

    setIsStarting(true);
    setError(null);

    try {
      // Filter questions based on flashcard mode if applicable
      let questions = studySet.questions;
      if (isFlashcardMode) {
        const progress = currentUser.flashcardProgress?.[studySet.id] ?? {
          knownCards: [],
          unknownCards: [],
        };
        if (flashcardStudyMode === "known") {
          questions = questions.filter(q => progress.knownCards.includes(q.id));
        } else if (flashcardStudyMode === "unknown") {
          questions = questions.filter(
            q =>
              progress.unknownCards.includes(q.id) ||
              (!progress.knownCards.includes(q.id) &&
               !progress.unknownCards.includes(q.id))
          );
        }
      }

      // Check if no questions remain after filtering
      if (questions.length === 0) {
        setError(null); // Don't show this as an error
        setIsStarting(false);
        return;
      }

      // Create a shallow clone of studySet with the filtered questions array
      const filteredStudySet = { ...studySet, questions };

      const result = await startSession(filteredStudySet, sessionOptions);

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

  const handleCompleteSession = async (flashcardUpdates = null) => {
    try {
      const result = await completeSession(flashcardUpdates);

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

  if (loading || sessionsLoading || authLoading || !studySetsReady) {
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
                <div className="mt-4 space-x-2">
                  <button
                    onClick={retryLoadStudySet}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    Retry
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
                    {(() => {
                      if (isFlashcardMode && flashcardStudyMode !== "all") {
                        const progress = currentUser?.flashcardProgress?.[studySet.id] ?? {
                          knownCards: [],
                          unknownCards: [],
                        };
                        if (flashcardStudyMode === "known") {
                          return studySet.questions.filter(q => progress.knownCards.includes(q.id)).length;
                        } else if (flashcardStudyMode === "unknown") {
                          return studySet.questions.filter(
                            q =>
                              progress.unknownCards.includes(q.id) ||
                              (!progress.knownCards.includes(q.id) &&
                               !progress.unknownCards.includes(q.id))
                          ).length;
                        }
                      }
                      return studySet.questions.length;
                    })()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Questions{isFlashcardMode && flashcardStudyMode !== "all" ? ` (${flashcardStudyMode})` : ""}
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

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Session Options
              </h2>

              <div className="space-y-4">
                {/* Flashcard Mode Options */}
                {isFlashcardMode && (
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Flashcard Mode</label>
                      <div 
                        className="group relative inline-block"
                        title="Choose which cards to study based on your progress"
                      >
                        <svg 
                          className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                          />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          <div className="space-y-1">
                            <div><strong>All:</strong> Study all flashcards (comprehensive review)</div>
                            <div><strong>Known:</strong> Review cards you've already learned</div>
                            <div><strong>Unknown:</strong> Focus on challenging or new cards</div>
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      {['all', 'known', 'unknown'].map((mode) => {
                        const isDisabled =
                          (mode === 'known' && knownCards.size === 0) ||
                          (mode === 'unknown' && unknownCards.size === 0);

                        return (
                          <div key={mode} className="flex items-center">
                            <input
                              type="radio"
                              id={`flashcard-mode-${mode}`}
                              name="flashcard-mode"
                              value={mode}
                              checked={flashcardStudyMode === mode}
                              onChange={() => setFlashcardStudyMode(mode)}
                              disabled={isDisabled}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                            />
                            <label htmlFor={`flashcard-mode-${mode}`} className={`ml-2 text-sm font-medium ${
                              isDisabled 
                                ? 'text-gray-400 dark:text-gray-500' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {mode === 'all' && `All Flashcards (${totalCards})`}
                              {mode === 'known' && `Known Flashcards (${knownCards.size})`}
                              {mode === 'unknown' && `Unknown Flashcards (${unknownCards.size})`}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    {flashcardStudyMode === 'known' && knownCards.size === 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400">No known cards available. Complete some flashcards first!</p>
                    )}
                    {flashcardStudyMode === 'unknown' && unknownCards.size === 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400">No unknown cards available. All cards have been learned!</p>
                    )}
                  </div>
                )}
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

                {!isFlashcardMode && (
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
                )}

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
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "Are you sure you want to reset your progress? This action cannot be undone."
                    );
                    if (confirmed) {
                      try {
                        // Reset flashcard progress
                        const flashcardUpdates = {
                          knownAdd: [],
                          knownRemove: Array.from(knownCards),
                          unknownAdd: [],
                          unknownRemove: Array.from(unknownCards)
                        };
                        
                        // Call the progress API to reset on server
                        const response = await fetch('/api/auth/progress', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            studySetId: studySet.id,
                            sessionStats: { score: 0, totalTime: 0 },
                            flashcardUpdates
                          })
                        });
                        
                        if (response.ok) {
                          // Reset local state
                          setKnownCards(new Set());
                          setUnknownCards(new Set());
                          alert("Progress has been reset successfully.");
                        } else {
                          throw new Error('Failed to reset progress on server');
                        }
                      } catch (error) {
                        console.error('Failed to reset progress:', error);
                        alert("Failed to reset progress. Please try again.");
                      }
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-600 transition-colors"
                >
                  Reset Progress
                </button>
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
                      sessionOptions.questionLimit < 1) ||
                    (isFlashcardMode && flashcardStudyMode === 'known' && knownCards.size === 0) ||
                    (isFlashcardMode && flashcardStudyMode === 'unknown' && unknownCards.size === 0) ||
                    getFilteredQuestionsCount() === 0
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
                      <span className="mr-2">
                        {isFlashcardMode ? "🃏" : "🎓"}
                      </span>
                      Start {isFlashcardMode ? "Flashcard" : "Study"} Session
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
              
              {/* Show alert when no filtered questions remain */}
              {studySet.questions.length > 0 && getFilteredQuestionsCount() === 0 && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">🎉</span>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {isFlashcardMode && flashcardStudyMode === 'unknown' 
                        ? 'You have no Unknown flashcards left 🎉'
                        : isFlashcardMode && flashcardStudyMode === 'known'
                        ? 'You have no Known flashcards left'
                        : 'No questions available for the selected filters'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show appropriate interface during session */}
        {currentSession && !showOptions && (
          <>
            {isFlashcardMode ? (
              <FlashcardInterface
                session={currentSession}
                currentUser={currentUser}
                onAnswerQuestion={handleAnswerQuestion}
                onCompleteSession={handleCompleteSession}
                onAbandonSession={handleAbandonSession}
              />
            ) : (
              <QuizInterface
                session={currentSession}
                onAnswerQuestion={handleAnswerQuestion}
                onCompleteSession={handleCompleteSession}
                onAbandonSession={handleAbandonSession}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
