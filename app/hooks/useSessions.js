/**
 * Custom hook for managing study sessions state
 */

import { useState, useEffect, useCallback } from "react";
import { sessionStorage } from "../lib/storage.js";
import {
  createStudySession,
  createSessionQuestion,
  calculateSessionStats,
} from "../lib/types.js";
import { shuffleArray } from "../lib/utils.js";
import { useAuth } from "./useAuth.js";

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { updateProgress } = useAuth();

  // Load sessions from storage
  const loadSessions = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const allSessions = sessionStorage.getAll();

      setSessions(allSessions);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Get session by ID
  const getSession = useCallback(
    (sessionId) => {
      // First try to find in loaded sessions
      const foundSession = sessions.find((session) => session.id === sessionId);

      if (foundSession) {
        return foundSession;
      }

      // If not found and sessions are still loading, return null
      if (loading) {
        return null;
      }

      // Fallback: try to get directly from storage
      try {
        const storageSession = sessionStorage.getById(sessionId);
        if (storageSession) {
          // Add to sessions array if found in storage but not in state
          setSessions((prev) => {
            const exists = prev.find((s) => s.id === sessionId);
            return exists ? prev : [...prev, storageSession];
          });
        }
        return storageSession;
      } catch (err) {
        console.error("Error fetching session from storage:", err);
        return null;
      }
    },
    [sessions, loading],
  );

  // Get sessions for a specific study set
  const getSessionsByStudySet = useCallback(
    (studySetId) => {
      return sessions.filter((session) => session.studySetId === studySetId);
    },
    [sessions],
  );

  // Start a new study session
  const startSession = useCallback((studySet, options = {}) => {
    try {
      if (!studySet || !studySet.questions || studySet.questions.length === 0) {
        throw new Error("Study set must have at least one question");
      }

      const {
        shuffleQuestions = false,
        shuffleAnswers = false,
        questionLimit = null,
      } = options;

      // Create session
      const session = createStudySession(studySet.id, studySet.name);

      // Prepare questions
      let questions = [...studySet.questions];

      // Shuffle questions if requested
      if (shuffleQuestions) {
        questions = shuffleArray(questions);
      }

      // Limit questions if requested
      if (questionLimit && questionLimit > 0) {
        questions = questions.slice(0, questionLimit);
      }

      // Create session questions
      session.questions = questions.map((question, index) => {
        // Handle flashcard questions differently
        if (question.type === "flashcard") {
          return {
            questionId: question.id,
            question: question.question,
            answer: question.answer,
            answers: [], // Empty for flashcards
            correctIndex: 0,
            correctIndices: null,
            type: "flashcard",
            questionNumber: index + 1,
            userAnswer: null,
            isCorrect: null,
            responseTime: 0,
            answeredAt: null,
            startTime: null,
          };
        }

        // Handle multiple choice questions
        let answers = [...question.answers];
        let correctIndex = question.correctIndex;
        let correctIndices = question.correctIndices;

        // Shuffle answers if requested (only for multiple choice)
        if (shuffleAnswers) {
          if (correctIndices) {
            // Handle multiple correct answers
            const shuffledData = shuffleAnswersWithCorrectIndices(
              answers,
              correctIndices,
            );
            answers = shuffledData.answers;
            correctIndices = shuffledData.correctIndices;
            correctIndex = shuffledData.correctIndices[0]; // Keep first for compatibility
          } else {
            // Handle single correct answer
            const shuffledData = shuffleAnswersWithCorrectIndex(
              answers,
              correctIndex,
            );
            answers = shuffledData.answers;
            correctIndex = shuffledData.correctIndex;
          }
        }

        return createSessionQuestion(
          question.id,
          question.question,
          answers,
          correctIndex,
          index + 1,
          correctIndices,
        );
      });

      session.totalQuestions = session.questions.length;

      // Save session
      const success = sessionStorage.save(session);

      if (success) {
        setCurrentSession(session);
        setSessions((prev) => [...prev, session]);
        return { success: true, session };
      } else {
        throw new Error("Failed to save session");
      }
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Failed to start session");
      return { success: false, error: err.message };
    }
  }, []);

  // Answer a question in current session
  const answerQuestion = useCallback(
    (questionIndex, answerIndex) => {
      try {
        if (!currentSession) {
          throw new Error("No active session");
        }

        if (
          questionIndex < 0 ||
          questionIndex >= currentSession.questions.length
        ) {
          throw new Error("Invalid question index");
        }

        const updatedSession = { ...currentSession };
        const question = updatedSession.questions[questionIndex];

        // Handle flashcard questions differently
        if (question.type === "flashcard") {
          // For flashcards, answerIndex is 1 for "known" and 0 for "unknown"
          question.userAnswer = answerIndex === 1 ? "known" : "unknown";
          question.isCorrect = answerIndex === 1; // Consider "known" as correct
        } else {
          // Handle multiple choice questions
          question.userAnswer = answerIndex;
          // Check if answer is correct (handle multiple correct answers)
          question.isCorrect = question.correctIndices
            ? question.correctIndices.includes(answerIndex)
            : answerIndex === question.correctIndex;
        }

        question.answeredAt = new Date().toISOString();

        // Calculate response time (if timing is being tracked)
        if (question.startTime) {
          question.responseTime = Math.floor(
            (new Date() - new Date(question.startTime)) / 1000,
          );
        }

        // Update session statistics
        updatedSession.userAnswers[questionIndex] = answerIndex;
        if (question.isCorrect) {
          updatedSession.correctAnswers += 1;
        }

        // Save updated session
        const success = sessionStorage.save(updatedSession);

        if (success) {
          setCurrentSession(updatedSession);
          setSessions((prev) =>
            prev.map((session) =>
              session.id === updatedSession.id ? updatedSession : session,
            ),
          );
          return { success: true, isCorrect: question.isCorrect };
        } else {
          throw new Error("Failed to save answer");
        }
      } catch (err) {
        console.error("Failed to answer question:", err);
        setError("Failed to save answer");
        return { success: false, error: err.message };
      }
    },
    [currentSession],
  );
  // Complete the current session
  const completeSession = useCallback(async () => {
    try {
      if (!currentSession) {
        throw new Error("No active session");
      }

      const updatedSession = { ...currentSession };
      updatedSession.endTime = new Date().toISOString();
      updatedSession.completed = true;

      // Calculate final statistics
      const startTime = new Date(updatedSession.startTime);
      const endTime = new Date(updatedSession.endTime);
      updatedSession.timeSpent = Math.floor((endTime - startTime) / 1000);

      const stats = calculateSessionStats(updatedSession);
      updatedSession.score = stats.score;

      // Prepare session statistics for progress update
      const sessionStats = {
        score: stats.score,
        totalTime: updatedSession.timeSpent,
        correctAnswers: stats.correctAnswers,
        totalQuestions: stats.totalQuestions,
        completedAt: updatedSession.endTime,
      };

      // Save completed session locally
      const localSaveSuccess = sessionStorage.save(updatedSession);

      if (localSaveSuccess) {
        // Update user progress in users.json
        try {
          console.log(
            "Updating progress for study set:",
            updatedSession.studySetId,
            "with stats:",
            sessionStats,
          );
          const progressUpdateSuccess = await updateProgress(
            updatedSession.studySetId,
            sessionStats,
          );

          if (progressUpdateSuccess) {
            console.log("Progress updated successfully");
          } else {
            console.warn(
              "Failed to update user progress, but session was saved locally",
            );
          }
        } catch (progressError) {
          console.error("Error updating progress:", progressError);
          // Don't fail the session completion if progress update fails
        }

        // Reload all sessions to ensure state consistency
        const allSessions = sessionStorage.getAll();
        setSessions(allSessions);
        setCurrentSession(null);
        return { success: true, session: updatedSession, stats };
      } else {
        throw new Error("Failed to save completed session");
      }
    } catch (err) {
      console.error("Failed to complete session:", err);
      setError("Failed to complete session");
      return { success: false, error: err.message };
    }
  }, [currentSession, updateProgress]);

  // Abandon current session
  const abandonSession = useCallback(() => {
    try {
      if (!currentSession) {
        return { success: true };
      }

      // Mark session as abandoned (not completed)
      const updatedSession = { ...currentSession };
      updatedSession.endTime = new Date().toISOString();
      updatedSession.abandoned = true;

      const startTime = new Date(updatedSession.startTime);
      const endTime = new Date(updatedSession.endTime);
      updatedSession.timeSpent = Math.floor((endTime - startTime) / 1000);

      // Save abandoned session
      sessionStorage.save(updatedSession);

      // Reload all sessions to ensure state consistency
      const allSessions = sessionStorage.getAll();
      setSessions(allSessions);
      setCurrentSession(null);

      return { success: true };
    } catch (err) {
      console.error("Failed to abandon session:", err);
      setError("Failed to abandon session");
      return { success: false, error: err.message };
    }
  }, [currentSession]);

  // Resume a session (load as current session)
  const resumeSession = useCallback(
    (sessionId) => {
      try {
        const session = getSession(sessionId);
        if (!session) {
          throw new Error("Session not found");
        }

        if (session.completed) {
          throw new Error("Cannot resume completed session");
        }

        setCurrentSession(session);
        return { success: true, session };
      } catch (err) {
        console.error("Failed to resume session:", err);
        setError("Failed to resume session");
        return { success: false, error: err.message };
      }
    },
    [getSession],
  );

  // Delete a session
  const deleteSession = useCallback(
    (sessionId) => {
      try {
        const success = sessionStorage.delete(sessionId);

        if (success) {
          setSessions((prev) =>
            prev.filter((session) => session.id !== sessionId),
          );

          // Clear current session if it was deleted
          if (currentSession && currentSession.id === sessionId) {
            setCurrentSession(null);
          }

          return { success: true };
        } else {
          throw new Error("Failed to delete session");
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
        setError("Failed to delete session");
        return { success: false, error: err.message };
      }
    },
    [currentSession],
  );

  // Get recent sessions
  const getRecentSessions = useCallback((limit = 10) => {
    return sessionStorage.getRecentSessions(limit);
  }, []);

  // Get session statistics for a study set
  const getStudySetSessionStats = useCallback(
    (studySetId) => {
      const studySetSessions = getSessionsByStudySet(studySetId);
      const completedSessions = studySetSessions.filter(
        (session) => session.completed,
      );

      if (completedSessions.length === 0) {
        return {
          totalSessions: 0,
          averageScore: 0,
          bestScore: 0,
          totalTimeSpent: 0,
          averageTimePerSession: 0,
        };
      }

      const totalSessions = completedSessions.length;
      const totalScore = completedSessions.reduce(
        (sum, session) => sum + session.score,
        0,
      );
      const bestScore = Math.max(
        ...completedSessions.map((session) => session.score),
      );
      const totalTimeSpent = completedSessions.reduce(
        (sum, session) => sum + session.timeSpent,
        0,
      );

      return {
        totalSessions,
        averageScore: Math.round(totalScore / totalSessions),
        bestScore,
        totalTimeSpent,
        averageTimePerSession: Math.round(totalTimeSpent / totalSessions),
      };
    },
    [getSessionsByStudySet],
  );

  // Get overall statistics
  const getOverallStats = useCallback(() => {
    const completedSessions = sessions.filter((session) => session.completed);

    if (completedSessions.length === 0) {
      return {
        totalSessions: 0,
        averageScore: 0,
        totalQuestionsAnswered: 0,
        totalTimeSpent: 0,
        correctAnswerRate: 0,
      };
    }

    const totalSessions = completedSessions.length;
    const totalScore = completedSessions.reduce(
      (sum, session) => sum + session.score,
      0,
    );
    const totalQuestionsAnswered = completedSessions.reduce(
      (sum, session) => sum + session.totalQuestions,
      0,
    );
    const totalCorrectAnswers = completedSessions.reduce(
      (sum, session) => sum + session.correctAnswers,
      0,
    );
    const totalTimeSpent = completedSessions.reduce(
      (sum, session) => sum + session.timeSpent,
      0,
    );

    return {
      totalSessions,
      averageScore: Math.round(totalScore / totalSessions),
      totalQuestionsAnswered,
      totalTimeSpent,
      correctAnswerRate:
        totalQuestionsAnswered > 0
          ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
          : 0,
    };
  }, [sessions]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Utility function to shuffle answers while maintaining correct index
  const shuffleAnswersWithCorrectIndex = (answers, correctIndex) => {
    const correctAnswer = answers[correctIndex];
    const shuffledAnswers = shuffleArray(answers);
    const newCorrectIndex = shuffledAnswers.indexOf(correctAnswer);

    return {
      answers: shuffledAnswers,
      correctIndex: newCorrectIndex,
    };
  };

  // Utility function to shuffle answers while maintaining multiple correct indices
  const shuffleAnswersWithCorrectIndices = (answers, correctIndices) => {
    const correctAnswers = correctIndices.map((index) => answers[index]);
    const shuffledAnswers = shuffleArray(answers);

    // Find new indices for all correct answers
    const newCorrectIndices = correctAnswers.map((correctAnswer) =>
      shuffledAnswers.indexOf(correctAnswer),
    );

    return {
      answers: shuffledAnswers,
      correctIndices: newCorrectIndices,
    };
  };

  return {
    // State
    sessions,
    currentSession,
    loading,
    error,

    // Actions
    loadSessions,
    getSession,
    getSessionsByStudySet,
    startSession,
    answerQuestion,
    completeSession,
    abandonSession,
    resumeSession,
    deleteSession,

    // Statistics and utilities
    getRecentSessions,
    getStudySetSessionStats,
    getOverallStats,
    clearError,
  };
};

export default useSessions;
