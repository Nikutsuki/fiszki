/**
 * CSV parser utility for study sets
 * Handles parsing CSV files with format: Question(;)Ans1(;)Ans2(;)Ans3(;)Ans4
 * Correct answers are marked with "$" prefix
 */

import {
  createQuestion,
  createStudySet,
  generateIdFromFilename,
} from "./types.js";

/**
 * Parse CSV content into study set questions
 * @param {string} csvContent - Raw CSV content ((;)-separated)
 * @param {string} fileName - Name of the CSV file (used for study set name)
 * @returns {Object} - Parsed study set or error
 */
export const parseCSVToStudySet = (
  csvContent,
  fileName = "Imported Study Set",
) => {
  try {
    // Remove file extension from name
    const studySetName = fileName.replace(/\.[^/.]+$/, "");

    // Split into lines and filter out empty lines
    const lines = csvContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return {
        success: false,
        error: "CSV file is empty",
      };
    }

    const questions = [];
    const errors = [];

    // Process each line
    lines.forEach((line, lineNumber) => {
      const result = parseCSVLine(line, lineNumber + 1);

      if (result.success) {
        questions.push(result.question);
      } else {
        errors.push(result.error);
      }
    });

    // Check if we have any valid questions
    if (questions.length === 0) {
      return {
        success: false,
        error: "No valid questions found in CSV file",
        details: errors,
      };
    }

    // Create study set with consistent ID based on filename
    const studySet = createStudySet(studySetName, `Imported from ${fileName}`);
    studySet.id = generateIdFromFilename(fileName);
    studySet.questions = questions;

    return {
      success: true,
      studySet,
      warnings: errors.length > 0 ? errors : null,
      totalQuestions: questions.length,
      skippedLines: errors.length,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error.message}`,
    };
  }
};

/**
 * Parse a single CSV line into a question
 * @param {string} line - CSV line to parse
 * @param {number} lineNumber - Line number for error reporting
 * @returns {Object} - Parsed question or error
 */
const parseCSVLine = (line, lineNumber) => {
  try {
    // Parse CSV line with proper handling of quoted fields
    const fields = parseCSVFields(line);

    // Validate field count
    if (fields.length !== 5) {
      return {
        success: false,
        error: `Line ${lineNumber}: Expected 5 fields (Question(;)Ans1(;)Ans2(;)Ans3(;)Ans4), found ${fields.length}`,
      };
    }

    const [questionText, ans1, ans2, ans3, ans4] = fields;

    // Validate question text
    if (!questionText.trim()) {
      return {
        success: false,
        error: `Line ${lineNumber}: Question text cannot be empty`,
      };
    }

    // Process answers and find correct ones
    const answers = [ans1, ans2, ans3, ans4];
    const correctIndices = [];
    const processedAnswers = [];

    answers.forEach((answer, index) => {
      const trimmedAnswer = answer.trim();

      if (trimmedAnswer.startsWith("$")) {
        // This is a correct answer
        correctIndices.push(index);
        // Remove the $ prefix for the actual answer text
        processedAnswers[index] = trimmedAnswer.substring(1).trim();
      } else {
        processedAnswers[index] = trimmedAnswer;
      }
    });

    // Validate we found at least one correct answer
    if (correctIndices.length === 0) {
      return {
        success: false,
        error: `Line ${lineNumber}: No correct answer found (mark correct answer with $ prefix)`,
      };
    }

    // Validate all answers have content
    const emptyAnswers = processedAnswers
      .map((answer, index) => ({ answer, index }))
      .filter(({ answer }) => !answer.trim())
      .map(({ index }) => index + 1);

    if (emptyAnswers.length > 0) {
      return {
        success: false,
        error: `Line ${lineNumber}: Empty answer(s) found at position(s): ${emptyAnswers.join(", ")}`,
      };
    }

    // Create the question (use first correct answer for compatibility)
    const question = createQuestion(
      questionText.trim(),
      processedAnswers,
      correctIndices[0],
    );

    // Store all correct indices for future use
    question.correctIndices = correctIndices;

    return {
      success: true,
      question,
    };
  } catch (error) {
    return {
      success: false,
      error: `Line ${lineNumber}: ${error.message}`,
    };
  }
};

/**
 * Parse CSV fields with (;) separators
 * @param {string} line - CSV line to parse
 * @returns {Array} - Array of field values
 */
const parseCSVFields = (line) => {
  // Simple split by (;) since we're using (;) as separators
  return line.split("(;)").map((field) => field.trim());
};

/**
 * Convert study set questions to CSV format
 * @param {Object} studySet - Study set to export
 * @returns {string} - CSV content
 */
export const studySetToCSV = (studySet) => {
  const lines = [];

  studySet.questions.forEach((question) => {
    const answers = [...question.answers];

    // Mark the correct answers with $
    if (question.correctIndices) {
      // Multiple correct answers
      question.correctIndices.forEach((index) => {
        answers[index] = "$" + answers[index];
      });
    } else {
      // Single correct answer (backwards compatibility)
      answers[question.correctIndex] = "$" + answers[question.correctIndex];
    }

    // Join fields with (;) (no escaping needed)
    const fields = [question.question, ...answers];
    lines.push(fields.join("(;)"));
  });

  return lines.join("\n");
};

/**
 * Validate CSV content before parsing
 * @param {string} csvContent - CSV content to validate
 * @returns {Object} - Validation result
 */
export const validateCSVContent = (csvContent) => {
  if (!csvContent || typeof csvContent !== "string") {
    return {
      valid: false,
      error: "CSV content must be a non-empty string",
    };
  }

  const trimmedContent = csvContent.trim();
  if (trimmedContent.length === 0) {
    return {
      valid: false,
      error: "CSV content is empty",
    };
  }

  const lines = trimmedContent
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return {
      valid: false,
      error: "No valid lines found in CSV",
    };
  }

  return {
    valid: true,
    lineCount: lines.length,
  };
};

/**
 * Generate sample CSV content for user reference
 * @returns {string} - Sample CSV content
 */
export const generateSampleCSV = () => {
  return `What is the capital of France?(;)London(;)Berlin(;)$Paris(;)Madrid
Which planet is known as the Red Planet?(;)Venus(;)$Mars(;)Jupiter(;)Saturn
What is 2 + 2?(;)$4(;)3(;)5(;)6
Who wrote Romeo and Juliet?(;)$William Shakespeare(;)Charles Dickens(;)Mark Twain(;)Jane Austen
Which are primary colors?(;)$Red(;)$Blue(;)Green(;)$Yellow
Which programming languages are object-oriented?(;)$Java(;)$C++(;)Assembly(;)$Python`;
};

/**
 * Create download link for CSV content
 * @param {string} csvContent - CSV content to download
 * @param {string} fileName - File name for download
 * @returns {string} - Download URL
 */
export const createCSVDownloadLink = (
  csvContent,
  fileName = "study-set.csv",
) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  return URL.createObjectURL(blob);
};

/**
 * Parse multiple CSV files
 * @param {FileList} files - File list from input
 * @returns {Promise<Array>} - Array of parsing results
 */
export const parseMultipleCSVFiles = async (files) => {
  const results = [];

  for (const file of files) {
    try {
      const content = await readFileContent(file);
      const result = parseCSVToStudySet(content, file.name);
      results.push({
        fileName: file.name,
        ...result,
      });
    } catch (error) {
      results.push({
        fileName: file.name,
        success: false,
        error: `Failed to read file: ${error.message}`,
      });
    }
  }

  return results;
};

/**
 * Read file content as text
 * @param {File} file - File to read
 * @returns {Promise<string>} - File content
 */
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
};
