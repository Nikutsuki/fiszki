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

  // Cleanup old sessions (keep last 30 days)
  sessionStorage.cleanup();
};
