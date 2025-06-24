/**
 * Local storage utilities for the study app
 * Handles all data persistence using browser localStorage
 */

import { STORAGE_KEYS, getDefaultStudySets } from "./types.js";

/**
 * Generic localStorage utilities
 */
export const storage = {
  get: (key, defaultValue = null) => {
    if (typeof window === "undefined") return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    if (typeof window === "undefined") return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      return false;
    }
  },

  remove: (key) => {
    if (typeof window === "undefined") return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  },

  clear: () => {
    if (typeof window === "undefined") return false;

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      return false;
    }
  },
};

/**
 * Study Sets Management
 */
export const studySetStorage = {
  getAll: () => {
    const studySets = storage.get(STORAGE_KEYS.STUDY_SETS, []);

    // Initialize with default study sets if none exist
    if (studySets.length === 0) {
      const defaultSets = getDefaultStudySets();
      studySetStorage.saveAll(defaultSets);
      return defaultSets;
    }

    return studySets;
  },

  getById: (id) => {
    const studySets = studySetStorage.getAll();
    return studySets.find((set) => set.id === id) || null;
  },

  save: (studySet) => {
    const studySets = studySetStorage.getAll();
    const existingIndex = studySets.findIndex((set) => set.id === studySet.id);

    studySet.updatedAt = new Date().toISOString();

    if (existingIndex >= 0) {
      studySets[existingIndex] = studySet;
    } else {
      studySets.push(studySet);
    }

    return storage.set(STORAGE_KEYS.STUDY_SETS, studySets);
  },

  saveAll: (studySets) => {
    return storage.set(STORAGE_KEYS.STUDY_SETS, studySets);
  },

  updateStats: (studySetId, sessionStats) => {
    const studySet = studySetStorage.getById(studySetId);
    if (!studySet) return false;

    studySet.stats.totalSessions += 1;
    studySet.stats.totalTimeSpent += sessionStats.totalTime;

    // Update average score
    const currentAvg = studySet.stats.averageScore;
    const sessions = studySet.stats.totalSessions;
    studySet.stats.averageScore = Math.round(
      (currentAvg * (sessions - 1) + sessionStats.score) / sessions,
    );

    // Update best score
    if (sessionStats.score > studySet.stats.bestScore) {
      studySet.stats.bestScore = sessionStats.score;
    }

    return studySetStorage.save(studySet);
  },
};

/**
 * Study Sessions Management
 */
export const sessionStorage = {
  getAll: () => {
    return storage.get(STORAGE_KEYS.SESSIONS, []);
  },

  getById: (sessionId) => {
    try {
      const sessions = sessionStorage.getAll();
      const foundSession = sessions.find((session) => session.id === sessionId);
      if (!foundSession) {
        console.warn(`Session with ID ${sessionId} not found in storage`);
      }
      return foundSession || null;
    } catch (error) {
      console.error(`Error getting session by ID ${sessionId}:`, error);
      return null;
    }
  },

  getByStudySetId: (studySetId) => {
    const sessions = sessionStorage.getAll();
    return sessions.filter((session) => session.studySetId === studySetId);
  },

  save: (session) => {
    try {
      if (!session || !session.id) {
        console.error("Invalid session data:", session);
        return false;
      }

      const sessions = sessionStorage.getAll();
      const existingIndex = sessions.findIndex((s) => s.id === session.id);

      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
        console.log(`Updated existing session: ${session.id}`);
      } else {
        sessions.push(session);
        console.log(`Added new session: ${session.id}`);
      }

      const success = storage.set(STORAGE_KEYS.SESSIONS, sessions);

      // Verify the session was saved correctly
      if (success) {
        // Use a fresh call to storage instead of recursive sessionStorage.getById
        const allSessions = storage.get(STORAGE_KEYS.SESSIONS, []);
        const verification = allSessions.find((s) => s.id === session.id);
        if (!verification) {
          console.error("Session save verification failed for ID:", session.id);
          return false;
        }
        console.log(`Session ${session.id} saved and verified successfully`);
      }

      return success;
    } catch (error) {
      console.error("Error saving session:", error);
      return false;
    }
  },

  getRecentSessions: (limit = 10) => {
    const sessions = sessionStorage.getAll();
    return sessions
      .filter((session) => session.completed)
      .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
      .slice(0, limit);
  },

  cleanup: (daysToKeep = 30) => {
    const sessions = sessionStorage.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const filteredSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= cutoffDate;
    });

    return storage.set(STORAGE_KEYS.SESSIONS, filteredSessions);
  },

  // Delete a specific session
  delete: (sessionId) => {
    const sessions = sessionStorage.getAll();
    const filteredSessions = sessions.filter(
      (session) => session.id !== sessionId,
    );
    return storage.set(STORAGE_KEYS.SESSIONS, filteredSessions);
  },
};

/**
 * Flashcard Progress Management
 */
export const flashcardStorage = {
  getAll: () => {
    return storage.get(STORAGE_KEYS.FLASHCARD_PROGRESS, {});
  },

  getByStudySet: (studySetId) => {
    const allProgress = flashcardStorage.getAll();
    return allProgress[studySetId] || {};
  },

  getCardProgress: (studySetId, cardId) => {
    const studySetProgress = flashcardStorage.getByStudySet(studySetId);
    return (
      studySetProgress[cardId] || {
        timesReviewed: 0,
        timesCorrect: 0,
        difficulty: 0.5, // 0 = easy, 1 = hard
        lastReviewed: null,
        nextReview: null,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        easeFactor: 2.5, // For spaced repetition
        interval: 1, // Days until next review
      }
    );
  },

  updateCardProgress: (studySetId, cardId, isCorrect, responseTime = 0) => {
    const allProgress = flashcardStorage.getAll();

    if (!allProgress[studySetId]) {
      allProgress[studySetId] = {};
    }

    const currentProgress = flashcardStorage.getCardProgress(
      studySetId,
      cardId,
    );
    const now = new Date().toISOString();

    // Update basic stats
    currentProgress.timesReviewed += 1;
    currentProgress.lastReviewed = now;

    if (isCorrect) {
      currentProgress.timesCorrect += 1;
      currentProgress.consecutiveCorrect += 1;
      currentProgress.consecutiveIncorrect = 0;

      // Make card easier over time if consistently correct
      if (currentProgress.consecutiveCorrect >= 3) {
        currentProgress.difficulty = Math.max(
          0,
          currentProgress.difficulty - 0.1,
        );
      }
    } else {
      currentProgress.consecutiveCorrect = 0;
      currentProgress.consecutiveIncorrect += 1;

      // Make card harder if getting wrong
      currentProgress.difficulty = Math.min(
        1,
        currentProgress.difficulty + 0.2,
      );
    }

    // Calculate spaced repetition schedule
    const scheduleResult = calculateSpacedRepetition(
      currentProgress,
      isCorrect,
      responseTime,
    );
    currentProgress.easeFactor = scheduleResult.easeFactor;
    currentProgress.interval = scheduleResult.interval;

    // Set next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + scheduleResult.interval);
    currentProgress.nextReview = nextReviewDate.toISOString();

    // Save updated progress
    allProgress[studySetId][cardId] = currentProgress;
    return storage.set(STORAGE_KEYS.FLASHCARD_PROGRESS, allProgress);
  },

  getCardsForReview: (studySetId, limit = null) => {
    const studySetProgress = flashcardStorage.getByStudySet(studySetId);
    const now = new Date();

    const cardsForReview = Object.entries(studySetProgress)
      .filter(([cardId, progress]) => {
        // Include cards that haven't been reviewed or are due for review
        return !progress.nextReview || new Date(progress.nextReview) <= now;
      })
      .sort(([, a], [, b]) => {
        // Prioritize by difficulty (harder cards first) and last reviewed
        if (a.difficulty !== b.difficulty) {
          return b.difficulty - a.difficulty;
        }
        // Then by longest time since last review
        const aLastReviewed = a.lastReviewed
          ? new Date(a.lastReviewed)
          : new Date(0);
        const bLastReviewed = b.lastReviewed
          ? new Date(b.lastReviewed)
          : new Date(0);
        return aLastReviewed - bLastReviewed;
      })
      .map(([cardId]) => cardId);

    return limit ? cardsForReview.slice(0, limit) : cardsForReview;
  },

  getStudySetStats: (studySetId) => {
    const studySetProgress = flashcardStorage.getByStudySet(studySetId);
    const cardProgresses = Object.values(studySetProgress);

    if (cardProgresses.length === 0) {
      return {
        totalCards: 0,
        reviewedCards: 0,
        masteredCards: 0,
        averageDifficulty: 0,
        dueForReview: 0,
      };
    }

    const reviewedCards = cardProgresses.filter((p) => p.timesReviewed > 0);
    const masteredCards = cardProgresses.filter(
      (p) => p.consecutiveCorrect >= 5 && p.difficulty < 0.3,
    );
    const now = new Date();
    const dueForReview = cardProgresses.filter(
      (p) => !p.nextReview || new Date(p.nextReview) <= now,
    );

    return {
      totalCards: cardProgresses.length,
      reviewedCards: reviewedCards.length,
      masteredCards: masteredCards.length,
      averageDifficulty:
        reviewedCards.length > 0
          ? reviewedCards.reduce((sum, p) => sum + p.difficulty, 0) /
            reviewedCards.length
          : 0,
      dueForReview: dueForReview.length,
    };
  },
};

/**
 * Calculate spaced repetition schedule using modified SM-2 algorithm
 */
const calculateSpacedRepetition = (cardProgress, isCorrect, responseTime) => {
  let { easeFactor, interval } = cardProgress;

  if (isCorrect) {
    // Successful recall
    if (interval === 1) {
      interval = 6; // First successful recall -> 6 days
    } else {
      interval = Math.round(interval * easeFactor);
    }

    // Adjust ease factor based on response quality
    // Assume faster response indicates better retention
    const responseQuality =
      responseTime > 0
        ? Math.max(0, Math.min(5, 5 - responseTime / 5)) // 0-5 scale
        : 3; // Default quality

    easeFactor =
      easeFactor +
      (0.1 - (5 - responseQuality) * (0.08 + (5 - responseQuality) * 0.02));
  } else {
    // Failed recall
    interval = 1; // Reset to 1 day
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  // Ensure ease factor stays within reasonable bounds
  easeFactor = Math.max(1.3, Math.min(2.5, easeFactor));

  return { easeFactor, interval };
};

/**
 * App Settings Management
 */
export const settingsStorage = {
  get: () => {
    return storage.get(STORAGE_KEYS.SETTINGS, {
      theme: "light",
      showTimer: true,
      shuffleQuestions: false,
      shuffleAnswers: false,
      autoAdvance: false,
      autoAdvanceDelay: 2000,
      soundEnabled: true,
    });
  },

  save: (settings) => {
    return storage.set(STORAGE_KEYS.SETTINGS, settings);
  },

  update: (partialSettings) => {
    const currentSettings = settingsStorage.get();
    const updatedSettings = { ...currentSettings, ...partialSettings };
    return settingsStorage.save(updatedSettings);
  },
};

/**
 * Data Import/Export utilities
 */
export const dataManager = {
  exportAll: () => {
    return {
      studySets: studySetStorage.getAll(),
      sessions: sessionStorage.getAll(),
      settings: settingsStorage.get(),
      exportDate: new Date().toISOString(),
      version: "1.0",
    };
  },

  importAll: (data) => {
    try {
      if (data.studySets) {
        studySetStorage.saveAll(data.studySets);
      }
      if (data.sessions) {
        storage.set(STORAGE_KEYS.SESSIONS, data.sessions);
      }
      if (data.settings) {
        settingsStorage.save(data.settings);
      }
      return { success: true, message: "Data imported successfully" };
    } catch (error) {
      console.error("Import error:", error);
      return { success: false, message: "Failed to import data" };
    }
  },

  reset: () => {
    try {
      storage.remove(STORAGE_KEYS.STUDY_SETS);
      storage.remove(STORAGE_KEYS.SESSIONS);
      storage.remove(STORAGE_KEYS.SETTINGS);
      return { success: true, message: "All data cleared successfully" };
    } catch (error) {
      console.error("Reset error:", error);
      return { success: false, message: "Failed to clear data" };
    }
  },
};

/**
 * Initialize storage on first load
 */
export const initializeStorage = () => {
  // This will create default study sets if none exist
  studySetStorage.getAll();

  // Initialize settings if they don't exist
  settingsStorage.get();

  // Initialize flashcard progress if it doesn't exist
  flashcardStorage.getAll();

  // Cleanup old sessions (keep last 30 days)
  sessionStorage.cleanup();
};
