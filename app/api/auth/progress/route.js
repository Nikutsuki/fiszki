import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import { promises as fs } from "fs";
import { generateContentId } from "../../../lib/types.js";

// Helper function to get users database path
function getUsersDbPath() {
  return path.join(process.cwd(), "private", "users.json");
}

// Helper function to load users from file
async function loadUsers() {
  try {
    const usersPath = getUsersDbPath();
    const usersData = await fs.readFile(usersPath, "utf8");
    return JSON.parse(usersData);
  } catch (error) {
    // If file doesn't exist, return empty users object
    return {};
  }
}

// Helper function to save users to file
async function saveUsers(users) {
  const usersPath = getUsersDbPath();
  const privateDir = path.dirname(usersPath);

  // Ensure private directory exists
  await fs.mkdir(privateDir, { recursive: true });

  await fs.writeFile(usersPath, JSON.stringify(users, null, 2), "utf8");
}

// Helper function to migrate old flashcard IDs to content-based IDs
async function migrateFlashcardIds(studySetId, oldKnownCards, oldUnknownCards) {
  try {
    // Load the CSV file to get the actual flashcard content
    const csvPath = path.join(process.cwd(), "private", "study_sets", `${studySetId}.csv`);
    const csvContent = await fs.readFile(csvPath, "utf8");
    
    // Parse CSV lines to get flashcard content
    const lines = csvContent.split('\n').filter(line => line.trim());
    const flashcards = lines.map(line => {
      const parts = line.split('(;)');
      if (parts.length === 2) {
        const question = parts[0].trim();
        const answer = parts[1].trim();
        return {
          oldId: null, // We don't know the old ID from CSV
          newId: generateContentId(question + '|' + answer),
          question,
          answer
        };
      }
      return null;
    }).filter(Boolean);
    
    // Since we can't map old IDs to content directly, we'll clear the old data
    // and rely on new sessions to rebuild the known/unknown status
    console.log(`Migrating flashcard IDs for study set ${studySetId}: clearing ${oldKnownCards.length} known and ${oldUnknownCards.length} unknown cards`);
    
    return {
      knownCards: [], // Clear old data
      unknownCards: [], // Clear old data
      migrated: true,
      flashcardCount: flashcards.length
    };
  } catch (error) {
    console.error(`Failed to migrate flashcard IDs for study set ${studySetId}:`, error);
    // If migration fails, return empty arrays to avoid corrupted data
    return {
      knownCards: [],
      unknownCards: [],
      migrated: false,
      error: error.message
    };
  }
}

/**
 * Helper function to update known/unknown sets with flashcard deltas
 * @param {Array} knownCards - Current array of known card IDs
 * @param {Array} unknownCards - Current array of unknown card IDs  
 * @param {Object} flashcardUpdates - Object containing delta arrays
 * @returns {Object} Updated sets with knownCards and unknownCards arrays
 */
function updateSetsForAnswer(knownCards, unknownCards, flashcardUpdates) {
  // Clone previous sets to avoid mutations and maintain data consistency
  // This ensures we don't accidentally modify the original arrays during processing
  const knownSet = new Set(knownCards);
  const unknownSet = new Set(unknownCards);

  // Extract delta arrays from updates (deltas are restricted to sessionCardIds only)
  // This constraint ensures we only modify cards that were actually part of the current session,
  // preventing accidental changes to unrelated flashcard progress
  const { knownAdd = [], knownRemove = [], unknownAdd = [], unknownRemove = [] } = flashcardUpdates;

  console.log(`Before updates - Known: ${knownSet.size}, Unknown: ${unknownSet.size}`);
  console.log(`Updates - knownAdd: ${knownAdd.length}, knownRemove: ${knownRemove.length}, unknownAdd: ${unknownAdd.length}, unknownRemove: ${unknownRemove.length}`);

  // Add cards to known set
  knownAdd.forEach(cardId => {
    knownSet.add(cardId);
    unknownSet.delete(cardId); // Remove from unknown if present to maintain exclusivity
  });

  // Remove cards from known set
  knownRemove.forEach(cardId => {
    knownSet.delete(cardId);
  });

  // Add cards to unknown set
  unknownAdd.forEach(cardId => {
    unknownSet.add(cardId);
    knownSet.delete(cardId); // Remove from known if present to maintain exclusivity
  });

  // Remove cards from unknown set
  unknownRemove.forEach(cardId => {
    unknownSet.delete(cardId);
  });

  return {
    knownCards: Array.from(knownSet),
    unknownCards: Array.from(unknownSet)
  };
}

/**
 * Helper function to compute session deltas for flashcard progress
 * @param {Set} previousKnown - Previous known cards set
 * @param {Set} previousUnknown - Previous unknown cards set
 * @param {Set} newKnown - New known cards set
 * @param {Set} newUnknown - New unknown cards set
 * @param {Array} sessionCardIds - Array of card IDs that were part of this session
 * @returns {Object} Delta object with add/remove arrays
 */
function computeSessionDeltas(previousKnown, previousUnknown, newKnown, newUnknown, sessionCardIds) {
  const deltas = {
    knownAdd: [],
    knownRemove: [],
    unknownAdd: [],
    unknownRemove: []
  };

  // Process only cards that were part of this session
  // Deltas are restricted to sessionCardIds to ensure we only track changes
  // for cards that were actually encountered during this study session
  sessionCardIds.forEach(cardId => {
    const wasKnown = previousKnown.has(cardId);
    const wasUnknown = previousUnknown.has(cardId);
    const isNowKnown = newKnown.has(cardId);
    const isNowUnknown = newUnknown.has(cardId);
    
    // Track transitions for this session card
    if (!wasKnown && isNowKnown) {
      deltas.knownAdd.push(cardId);
    }
    if (wasKnown && !isNowKnown) {
      deltas.knownRemove.push(cardId);
    }
    if (!wasUnknown && isNowUnknown) {
      deltas.unknownAdd.push(cardId);
    }
    if (wasUnknown && !isNowUnknown) {
      deltas.unknownRemove.push(cardId);
    }
  });

  return deltas;
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fiszki_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const sessionData = JSON.parse(sessionCookie.value);
    const { userId } = sessionData;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    const { studySetId, sessionStats, flashcardUpdates } = await request.json();

    if (!studySetId || !sessionStats) {
      return NextResponse.json(
        {
          success: false,
          error: "Study set ID and session stats are required",
        },
        { status: 400 },
      );
    }

    // Load users and find current user
    const users = await loadUsers();
    const user = users[userId];

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Initialize progress structure if needed
    if (!user.progress) {
      user.progress = { studySets: [] };
    }
    if (!user.progress.studySets) {
      user.progress.studySets = [];
    }

    // Find or create study set progress
    let studySetProgress = user.progress.studySets.find(
      (progress) => progress.id === studySetId,
    );

    if (!studySetProgress) {
      studySetProgress = {
        id: studySetId,
        totalSessions: 0,
        bestScore: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        lastAttempt: null,
        stats: {
          totalSessions: 0,
          averageScore: 0,
          bestScore: 0,
          totalTimeSpent: 0,
        },
      };
      user.progress.studySets.push(studySetProgress);
    }

    // Update progress with new session stats
    const previousSessions = studySetProgress.totalSessions;
    const previousAverage = studySetProgress.averageScore;

    studySetProgress.totalSessions += 1;
    studySetProgress.lastScore = sessionStats.score;
    studySetProgress.bestScore = Math.max(
      studySetProgress.bestScore,
      sessionStats.score,
    );
    studySetProgress.averageScore = Math.round(
      (previousAverage * previousSessions + sessionStats.score) /
        studySetProgress.totalSessions,
    );
    studySetProgress.totalTimeSpent += sessionStats.totalTime || 0;
    studySetProgress.lastAttempt = new Date().toISOString();

    // Also update the stats object for consistency
    studySetProgress.stats = {
      totalSessions: studySetProgress.totalSessions,
      averageScore: studySetProgress.averageScore,
      bestScore: studySetProgress.bestScore,
      totalTimeSpent: studySetProgress.totalTimeSpent,
    };

    // Handle flashcard updates if provided
    if (flashcardUpdates) {
      console.log(`Processing flashcard updates for study set ${studySetId}:`, flashcardUpdates);
      
      // Initialize flashcardProgress structure if needed
      if (!user.flashcardProgress) {
        user.flashcardProgress = {};
      }
      if (!user.flashcardProgress[studySetId]) {
        user.flashcardProgress[studySetId] = {
          knownCards: [],
          unknownCards: [],
          lastUpdated: null
        };
      }

      const flashcardProgress = user.flashcardProgress[studySetId];
      
      // Check if we need to migrate old random IDs to content-based IDs
      let knownCards = flashcardProgress.knownCards || [];
      let unknownCards = flashcardProgress.unknownCards || [];
      
      // Detect old random IDs (they typically contain random characters and are longer)
      const hasOldIds = [...knownCards, ...unknownCards].some(id => 
        id.length > 10 && id.includes('m') && id.match(/[a-z]{3,}\d+[a-z]+/)
      );
      
      if (hasOldIds) {
        console.log(`Detected old flashcard IDs for study set ${studySetId}, initiating migration`);
        const migrationResult = await migrateFlashcardIds(studySetId, knownCards, unknownCards);
        if (migrationResult.migrated) {
          knownCards = migrationResult.knownCards;
          unknownCards = migrationResult.unknownCards;
          console.log(`Successfully migrated flashcard IDs for study set ${studySetId}`);
        }
      }
      
      // Apply flashcard updates using extracted helper function
      const updatedSets = updateSetsForAnswer(knownCards, unknownCards, flashcardUpdates);
      
      // Update the progress with merged results
      flashcardProgress.knownCards = updatedSets.knownCards;
      flashcardProgress.unknownCards = updatedSets.unknownCards;
      flashcardProgress.lastUpdated = new Date().toISOString();
      
      console.log(`After updates - Known: ${flashcardProgress.knownCards.length}, Unknown: ${flashcardProgress.unknownCards.length}`);
      console.log(`Updated flashcard progress for ${studySetId}`);
    }

    // Save updated user data
    await saveUsers(users);

    // Return updated user data (without password)
    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: "Progress updated successfully",
    });
  } catch (error) {
    console.error("Progress update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
