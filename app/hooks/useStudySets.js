import { useState, useEffect, useCallback } from "react";
import { parseCSVToStudySet } from "../lib/csvParser.js";
import { studySetStorage } from "../lib/storage.js"; // Fallback for non-authenticated users
import { useAuth } from "./useAuth";

export const useStudySets = () => {
  const [studySets, setStudySets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser, updateProgress, loading: authLoading } = useAuth();
  // Function to fetch and parse a single CSV file from protected endpoint
  const fetchAndParseCsv = async (filename) => {
    try {
      console.log(`Loading study set: ${filename}`);
      const response = await fetch(`/api/study_sets/${filename}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
      }

      const csvContent = await response.text();
      const result = parseCSVToStudySet(csvContent, filename);

      if (result.success) {
        console.log(`Successfully loaded study set: ${filename}, ID: ${result.studySet.id}`);
        return result.studySet;
      } else {
        console.error(
          `Error parsing ${filename}:`,
          result.error,
          result.details,
        );
        throw new Error(`Failed to parse ${filename}: ${result.error}`);
      }
    } catch (err) {
      console.error(`Error loading study set ${filename}:`, err);
      return null;
    }
  };

  // Load shared study sets (requires authentication)
  const loadStudySets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!currentUser) {
        // If no user, clear study sets and stop loading
        setStudySets([]);
        setLoading(false);
        return;
      }

      // Load shared study sets from protected endpoint
      const response = await fetch("/api/study_sets", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please log in to access study sets.");
        } else {
          throw new Error(
            `Failed to fetch CSV file list: ${response.statusText}`,
          );
        }
        setLoading(false);
        return;
      }      const csvFilesToLoad = await response.json();
      console.log(`Loading ${csvFilesToLoad.length} study sets:`, csvFilesToLoad);
      const loadedStudySets = [];

      for (const filename of csvFilesToLoad) {
        const studySet = await fetchAndParseCsv(filename);
        if (studySet) {
          // Merge with user-specific stats
          let currentStats = studySet.stats;
          const userStudySet = currentUser.progress.studySets?.find(
            (set) => set.id === studySet.id,
          );
          if (userStudySet) {
            currentStats = userStudySet.stats;
          }
          loadedStudySets.push({ ...studySet, stats: currentStats });
        }
      }
      
      console.log(`Successfully loaded ${loadedStudySets.length} study sets`);
      setStudySets(loadedStudySets);
    } catch (err) {
      console.error("Failed to load study sets:", err);
      setError("Failed to load study sets from server.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]); // Added currentUser as a dependency

  // Initialize on mount
  useEffect(() => {
    loadStudySets();
  }, [loadStudySets, authLoading]);
  // Get study set by ID (from loaded static sets)
  const getStudySet = useCallback(
    (id) => {
      console.log(`Looking for study set with ID: ${id}`);
      console.log(`Available study sets:`, studySets.map(set => ({ id: set.id, name: set.name })));
      const found = studySets.find((set) => set.id === id) || null;
      console.log(`Found study set:`, found ? { id: found.id, name: found.name } : null);
      return found;
    },
    [studySets],
  );

  // Update study set stats (user-specific progress)
  const updateStudySetStats = useCallback(
    async (studySetId, sessionStats) => {
      try {
        if (!currentUser) {
          throw new Error("Authentication required to update statistics.");
        }

        const success = await updateProgress(studySetId, sessionStats);

        if (success) {
          // Update the in-memory state to reflect the stat change
          setStudySets((prev) =>
            prev.map((set) => {
              if (set.id === studySetId) {
                const updatedStats =
                  currentUser.progress.studySets?.find(
                    (s) => s.id === studySetId,
                  )?.stats || set.stats;
                return {
                  ...set,
                  stats: updatedStats,
                };
              }
              return set;
            }),
          );
          return { success: true };
        } else {
          throw new Error("Failed to update statistics.");
        }
      } catch (err) {
        console.error("Failed to update study set stats:", err);
        setError("Failed to update statistics.");
        return { success: false, error: err.message };
      }
    },
    [currentUser, updateProgress],
  );
  // Search study sets
  const searchStudySets = useCallback(
    (query) => {
      if (!query.trim()) return studySets;

      const lowerQuery = query.toLowerCase();
      return studySets.filter((set) =>
        set.name.toLowerCase().includes(lowerQuery),
      );
    },
    [studySets],
  );

  // Sort study sets (can still sort static sets)
  const sortStudySets = useCallback(
    (sets, criteria = "name", direction = "asc") => {
      const sorted = [...sets].sort((a, b) => {
        let aValue, bValue;

        switch (criteria) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "created":
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case "updated":
            aValue = new Date(a.updatedAt);
            bValue = new Date(b.updatedAt);
            break;
          case "questions":
            aValue = a.questions.length;
            bValue = b.questions.length;
            break;
          case "sessions":
            aValue = a.stats.totalSessions;
            bValue = b.stats.totalSessions;
            break;
          case "score":
            aValue = a.stats.averageScore;
            bValue = a.stats.averageScore;
            break;
          default:
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }

        if (aValue < bValue) return direction === "asc" ? -1 : 1;
        if (aValue > bValue) return direction === "asc" ? 1 : -1;
        return 0;
      });

      return sorted;
    },
    [], // No dependency on studySets as it's passed as an argument
  );

  // Get overall statistics (still relevant for static sets with mutable stats)
  const getStatistics = useCallback(() => {
    const totalSets = studySets.length;
    const totalQuestions = studySets.reduce(
      (sum, set) => sum + set.questions.length,
      0,
    );
    const totalSessions = studySets.reduce(
      (sum, set) => sum + set.stats.totalSessions,
      0,
    );
    const averageQuestionsPerSet =
      totalSets > 0 ? Math.round(totalQuestions / totalSets) : 0;

    const setsWithSessions = studySets.filter(
      (set) => set.stats.totalSessions > 0,
    );
    const overallAverageScore =
      setsWithSessions.length > 0
        ? Math.round(
            setsWithSessions.reduce(
              (sum, set) => sum + set.stats.averageScore,
              0,
            ) / setsWithSessions.length,
          )
        : 0;

    return {
      totalSets,
      totalQuestions,
      totalSessions,
      averageQuestionsPerSet,
      overallAverageScore,
      mostStudiedSet: studySets.reduce(
        (max, set) =>
          set.stats.totalSessions > (max?.stats.totalSessions || 0) ? set : max,
        null,
      ),
      bestPerformingSet: studySets.reduce(
        (max, set) =>
          set.stats.bestScore > (max?.stats.bestScore || 0) ? set : max,
        null,
      ),    };
  }, [studySets]); // Remove unnecessary currentUser dependency

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    studySets,
    loading,
    error,

    // Actions
    getStudySet,
    updateStudySetStats,
    loadStudySets,

    // Utilities
    searchStudySets,
    sortStudySets,
    getStatistics,
    clearError,
  };
};

export default useStudySets;
