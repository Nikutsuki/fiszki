/**
 * Data structures and types for the study app
 */

// Study Set structure
export const createStudySet = (name) => ({
  id: generateId(),
  name,
  questions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stats: {
    totalSessions: 0,
    averageScore: 0,
    bestScore: 0,
    totalTimeSpent: 0,
  },
});

// Question structure - supports both multiple choice and flashcard types
export const createQuestion = (
  question,
  answers,
  correctIndex,
  type = "multiple_choice",
) => ({
  id: generateId(),
  question,
  type, // "multiple_choice" or "flashcard"
  answers:
    type === "flashcard"
      ? [answers] // For flashcards, answers is just the single answer string
      : answers.length === 4
        ? answers
        : [...answers, ...Array(4 - answers.length).fill("")],
  correctIndex: type === "flashcard" ? 0 : correctIndex,
  createdAt: new Date().toISOString(),
  stats: {
    timesAnswered: 0,
    timesCorrect: 0,
    averageResponseTime: 0,
  },
});

// Flashcard-specific question structure
export const createFlashcard = (question, answer) => ({
  id: generateId(),
  question,
  answer,
  type: "flashcard",
  createdAt: new Date().toISOString(),
  stats: {
    timesAnswered: 0,
    timesCorrect: 0,
    averageResponseTime: 0,
    difficulty: 0.5, // 0 = easy, 1 = hard
    lastReviewed: null,
    nextReview: null,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
  },
});

// Study Session structure
export const createStudySession = (studySetId, studySetName) => ({
  id: generateId(),
  studySetId,
  studySetName,
  startTime: new Date().toISOString(),
  endTime: null,
  questions: [],
  userAnswers: [],
  score: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  timeSpent: 0,
  completed: false,
});

// Session Question structure
export const createSessionQuestion = (
  questionId,
  question,
  answers,
  correctIndex,
  questionNumber,
  correctIndices = null,
) => ({
  questionId,
  question,
  answers,
  correctIndex,
  correctIndices,
  questionNumber,
  userAnswer: null,
  isCorrect: null,
  responseTime: 0,
  answeredAt: null,
});

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Generate consistent ID from filename (for CSV-based study sets)
export const generateIdFromFilename = (filename) => {
  // Remove file extension and convert to lowercase
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "").toLowerCase();
  // Replace spaces and special characters with hyphens
  return nameWithoutExt
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

// Validate study set
export const validateStudySet = (studySet) => {
  const errors = [];

  if (!studySet.name || studySet.name.trim().length < 1) {
    errors.push("Study set name is required");
  }

  if (studySet.questions.length < 1) {
    errors.push("At least one question is required");
  }

  studySet.questions.forEach((question, index) => {
    if (!question.question || question.question.trim().length < 1) {
      errors.push(`Question ${index + 1}: Question text is required`);
    }

    const validAnswers = question.answers.filter(
      (answer) => answer.trim().length > 0,
    );
    if (validAnswers.length < 2) {
      errors.push(`Question ${index + 1}: At least 2 answers are required`);
    }

    if (
      question.correctIndex < 0 ||
      question.correctIndex >= question.answers.length ||
      !question.answers[question.correctIndex] ||
      question.answers[question.correctIndex].trim().length === 0
    ) {
      errors.push(
        `Question ${index + 1}: Valid correct answer must be selected`,
      );
    }
  });

  return errors;
};

// Validate question
export const validateQuestion = (question) => {
  const errors = [];

  if (!question.question || question.question.trim().length < 1) {
    errors.push("Question text is required");
  }

  const validAnswers = question.answers.filter(
    (answer) => answer && answer.trim().length > 0,
  );
  if (validAnswers.length < 2) {
    errors.push("At least 2 answers are required");
  }

  if (
    question.correctIndex < 0 ||
    question.correctIndex >= question.answers.length ||
    !question.answers[question.correctIndex] ||
    question.answers[question.correctIndex].trim().length === 0
  ) {
    errors.push("Valid correct answer must be selected");
  }

  return errors;
};

// Calculate session statistics
export const calculateSessionStats = (session) => {
  if (!session.completed) {
    return {
      score: 0,
      percentage: 0,
      averageResponseTime: 0,
      totalTime: 0,
    };
  }

  const totalQuestions = session.questions.length;
  const correctAnswers = session.questions.filter((q) => {
    // Handle both flashcard and multiple choice questions
    if (q.type === "flashcard") {
      return q.userAnswer === "known" || q.isCorrect === true;
    }
    return q.isCorrect === true;
  }).length;

  const score =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

  const totalResponseTime = session.questions.reduce(
    (sum, q) => sum + (q.responseTime || 0),
    0,
  );
  const averageResponseTime =
    totalQuestions > 0 ? Math.round(totalResponseTime / totalQuestions) : 0;

  return {
    score,
    percentage: score,
    correctAnswers,
    totalQuestions,
    averageResponseTime,
    totalTime: session.timeSpent || 0,
  };
};

// Format time duration
export const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

// Default study sets for new users (empty - use CSV imports)
export const getDefaultStudySets = () => [];

// Storage keys
export const STORAGE_KEYS = {
  STUDY_SETS: "study_sets",
  SESSIONS: "study_sessions",
  SETTINGS: "app_settings",
  FLASHCARD_PROGRESS: "flashcard_progress",
};
