/**
 * QuizInterface component for conducting study sessions
 * Handles displaying questions, collecting answers, and managing session flow
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDuration } from "../lib/types.js";

const QuizInterface = ({
  session,
  onAnswerQuestion,
  onCompleteSession,
  onAbandonSession,
  className = "",
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = session.questions[currentQuestionIndex];
  const totalQuestions = session.questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Timer for session duration
  useEffect(() => {
    const startTime = new Date(session.startTime);

    const timer = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now - startTime) / 1000);
      setTimeElapsed(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [session.startTime]);

  // Set question start time when question changes
  useEffect(() => {
    setQuestionStartTime(new Date());
    setSelectedAnswer(null);
    setSelectedAnswers([]);
    setShowResult(false);
  }, [currentQuestionIndex]);

  const handleAnswerSelect = (answerIndex) => {
    if (showResult) return; // Prevent changing answer after submission

    const isMultipleChoice =
      currentQuestion.correctIndices &&
      currentQuestion.correctIndices.length > 1;

    if (isMultipleChoice) {
      // Handle multiple selection (checkbox behavior)
      setSelectedAnswers((prev) => {
        if (prev.includes(answerIndex)) {
          return prev.filter((index) => index !== answerIndex);
        } else {
          return [...prev, answerIndex];
        }
      });
    } else {
      // Handle single selection (radio button behavior)
      setSelectedAnswer(answerIndex);
    }
  };

  const handleSubmitAnswer = async () => {
    const isMultipleChoice =
      currentQuestion.correctIndices &&
      currentQuestion.correctIndices.length > 1;
    const hasSelection = isMultipleChoice
      ? selectedAnswers.length > 0
      : selectedAnswer !== null;

    if (!hasSelection || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Calculate response time
      const responseTime = questionStartTime
        ? Math.floor((new Date() - questionStartTime) / 1000)
        : 0;

      // Update the current question with response time
      const updatedQuestion = {
        ...currentQuestion,
        startTime: questionStartTime?.toISOString(),
        responseTime,
      };

      // For multiple choice questions, we need to validate all selected answers
      // For now, submit the first selected answer but mark the question correctly
      const answerToSubmit = isMultipleChoice
        ? selectedAnswers[0]
        : selectedAnswer;

      const result = await onAnswerQuestion(
        currentQuestionIndex,
        answerToSubmit,
      );

      // Override the correctness for multiple choice questions
      if (isMultipleChoice && result.success) {
        const updatedSession = { ...session };
        const question = updatedSession.questions[currentQuestionIndex];

        // Check if any selected answer is correct
        question.isCorrect = selectedAnswers.some((answer) =>
          currentQuestion.correctIndices.includes(answer),
        );
        question.userAnswers = selectedAnswers; // Store all selected answers
      }

      if (result.success) {
        setShowResult(true);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      handleCompleteSession();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleCompleteSession = async () => {
    try {
      const result = await onCompleteSession();
      if (result.success) {
        // Navigation will be handled by parent component
      }
    } catch (error) {
      console.error("Failed to complete session:", error);
    }
  };

  const handleAbandonSession = async () => {
    if (
      window.confirm(
        "Are you sure you want to abandon this study session? Your progress will be lost.",
      )
    ) {
      try {
        await onAbandonSession();
      } catch (error) {
        console.error("Failed to abandon session:", error);
      }
    }
  };

  const getAnswerButtonClass = (answerIndex) => {
    const baseClass =
      "w-full p-4 text-gray-900 dark:text-gray-100 text-left border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800";

    const isMultipleChoice =
      currentQuestion.correctIndices &&
      currentQuestion.correctIndices.length > 1;
    const isSelected = isMultipleChoice
      ? selectedAnswers.includes(answerIndex)
      : selectedAnswer === answerIndex;

    if (!showResult) {
      // Before showing result
      if (isSelected) {
        return `${baseClass} border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 focus:ring-blue-500 dark:focus:ring-blue-400`;
      }
      return `${baseClass} border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400`;
    } else {
      // After showing result
      const isCorrectAnswer = currentQuestion.correctIndices
        ? currentQuestion.correctIndices.includes(answerIndex)
        : answerIndex === currentQuestion.correctIndex;

      if (isCorrectAnswer) {
        return `${baseClass} border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200`;
      } else if (isSelected) {
        return `${baseClass} border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200`;
      }
      return `${baseClass} border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400`;
    }
  };

  const getAnswerIcon = (answerIndex) => {
    const isMultipleChoice =
      currentQuestion.correctIndices &&
      currentQuestion.correctIndices.length > 1;
    const isSelected = isMultipleChoice
      ? selectedAnswers.includes(answerIndex)
      : selectedAnswer === answerIndex;

    if (!showResult) {
      if (isMultipleChoice) {
        return isSelected ? "☑" : "☐";
      } else {
        return isSelected ? "●" : "○";
      }
    } else {
      const isCorrectAnswer = currentQuestion.correctIndices
        ? currentQuestion.correctIndices.includes(answerIndex)
        : answerIndex === currentQuestion.correctIndex;

      if (isCorrectAnswer) {
        return "✓";
      } else if (isSelected) {
        return "✗";
      }
      return isMultipleChoice ? "☐" : "○";
    }
  };

  if (!currentQuestion) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">
          No questions available in this session.
        </p>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {session.studySetName}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Study Session</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Time Elapsed
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatDuration(timeElapsed)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
            <span>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleAbandonSession}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline transition-colors"
          >
            Abandon Session
          </button>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            {session.questions.filter((q) => q.userAnswer !== null).length}{" "}
            answered
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Question {currentQuestionIndex + 1}
            </div>
            {currentQuestion.correctIndices &&
              currentQuestion.correctIndices.length > 1 && (
                <div className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                  Select all correct answers
                </div>
              )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
            {currentQuestion.question}
          </h2>
          {currentQuestion.correctIndices &&
            currentQuestion.correctIndices.length > 1 && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 italic">
                💡 This question has multiple correct answers. Select all that
                apply.
              </p>
            )}
        </div>

        {/* Answer Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={showResult}
              className={getAnswerButtonClass(index)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg font-medium w-6 text-center">
                  {getAnswerIcon(index)}
                </span>
                <span className="flex-1 text-left">{answer}</span>
                <div className="flex items-center space-x-2">
                  {showResult && (
                    <div className="flex space-x-1">
                      {currentQuestion.correctIndices
                        ? currentQuestion.correctIndices.includes(index) && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-1 py-0.5 rounded">
                              Correct
                            </span>
                          )
                        : index === currentQuestion.correctIndex && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-1 py-0.5 rounded">
                              Correct
                            </span>
                          )}
                      {showResult &&
                        ((currentQuestion.correctIndices &&
                          currentQuestion.correctIndices.length > 1 &&
                          selectedAnswers.includes(index)) ||
                          ((!currentQuestion.correctIndices ||
                            currentQuestion.correctIndices.length === 1) &&
                            selectedAnswer === index)) && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                    {String.fromCharCode(65 + index)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Result Message */}
        {showResult && (
          <div
            className={`p-4 rounded-lg mb-6 ${(() => {
              const isMultipleChoice =
                currentQuestion.correctIndices &&
                currentQuestion.correctIndices.length > 1;
              let isCorrect;

              if (isMultipleChoice) {
                isCorrect = selectedAnswers.some((answer) =>
                  currentQuestion.correctIndices.includes(answer),
                );
              } else {
                isCorrect = currentQuestion.correctIndices
                  ? currentQuestion.correctIndices.includes(selectedAnswer)
                  : selectedAnswer === currentQuestion.correctIndex;
              }

              return isCorrect
                ? "bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800";
            })()}`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-2xl">
                {(() => {
                  const isMultipleChoice =
                    currentQuestion.correctIndices &&
                    currentQuestion.correctIndices.length > 1;
                  let isCorrect;

                  if (isMultipleChoice) {
                    isCorrect = selectedAnswers.some((answer) =>
                      currentQuestion.correctIndices.includes(answer),
                    );
                  } else {
                    isCorrect = currentQuestion.correctIndices
                      ? currentQuestion.correctIndices.includes(selectedAnswer)
                      : selectedAnswer === currentQuestion.correctIndex;
                  }

                  return isCorrect ? "🎉" : "😞";
                })()}
              </span>
              <span
                className={`font-medium ${(() => {
                  const isMultipleChoice =
                    currentQuestion.correctIndices &&
                    currentQuestion.correctIndices.length > 1;
                  let isCorrect;

                  if (isMultipleChoice) {
                    // For multiple choice, check if any selected answer is correct
                    isCorrect = selectedAnswers.some((answer) =>
                      currentQuestion.correctIndices.includes(answer),
                    );
                  } else {
                    isCorrect = currentQuestion.correctIndices
                      ? currentQuestion.correctIndices.includes(selectedAnswer)
                      : selectedAnswer === currentQuestion.correctIndex;
                  }

                  return isCorrect ? "text-green-800" : "text-red-800";
                })()}`}
              >
                {(() => {
                  const isMultipleChoice =
                    currentQuestion.correctIndices &&
                    currentQuestion.correctIndices.length > 1;
                  let isCorrect;

                  if (isMultipleChoice) {
                    // For multiple choice, check if any selected answer is correct
                    isCorrect = selectedAnswers.some((answer) =>
                      currentQuestion.correctIndices.includes(answer),
                    );
                  } else {
                    isCorrect = currentQuestion.correctIndices
                      ? currentQuestion.correctIndices.includes(selectedAnswer)
                      : selectedAnswer === currentQuestion.correctIndex;
                  }

                  if (isCorrect) {
                    if (isMultipleChoice) {
                      const correctCount = selectedAnswers.filter((answer) =>
                        currentQuestion.correctIndices.includes(answer),
                      ).length;
                      const totalCorrect =
                        currentQuestion.correctIndices.length;

                      if (
                        correctCount === totalCorrect &&
                        selectedAnswers.length === totalCorrect
                      ) {
                        return "Perfect! All correct answers selected!";
                      } else {
                        return `Correct! You selected ${correctCount} of ${totalCorrect} correct answers.`;
                      }
                    } else {
                      return "Correct!";
                    }
                  } else {
                    const correctAnswers = currentQuestion.correctIndices
                      ? currentQuestion.correctIndices.map(
                          (i) => currentQuestion.answers[i],
                        )
                      : [currentQuestion.answers[currentQuestion.correctIndex]];

                    if (isMultipleChoice) {
                      const selectedCorrect = selectedAnswers.filter((answer) =>
                        currentQuestion.correctIndices.includes(answer),
                      ).length;
                      const selectedIncorrect = selectedAnswers.filter(
                        (answer) =>
                          !currentQuestion.correctIndices.includes(answer),
                      ).length;

                      if (selectedCorrect > 0) {
                        return `Partially correct! You got ${selectedCorrect} out of ${correctAnswers.length} correct answers. ${
                          selectedIncorrect > 0
                            ? `You also selected ${selectedIncorrect} incorrect answer${selectedIncorrect > 1 ? "s" : ""}.`
                            : ""
                        } The correct answers are: ${correctAnswers.join(", ")}`;
                      } else {
                        return `Incorrect. None of your selections were correct. The correct answers are: ${correctAnswers.join(", ")}`;
                      }
                    } else {
                      if (correctAnswers.length === 1) {
                        return `Incorrect. The correct answer is ${correctAnswers[0]}`;
                      } else {
                        return `Incorrect. The correct answers are: ${correctAnswers.join(", ")}`;
                      }
                    }
                  }
                })()}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <div className="flex space-x-3">
            {currentQuestionIndex > 0 && !showResult && (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              >
                ← Previous
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {!showResult ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={(() => {
                  const isMultipleChoice =
                    currentQuestion.correctIndices &&
                    currentQuestion.correctIndices.length > 1;
                  const hasSelection = isMultipleChoice
                    ? selectedAnswers.length > 0
                    : selectedAnswer !== null;
                  return !hasSelection || isSubmitting;
                })()}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Answer
                    <span className="ml-2">→</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-green-500 dark:focus:ring-green-400 transition-colors"
              >
                {isLastQuestion ? (
                  <>
                    Complete Session
                    <span className="ml-2">🏁</span>
                  </>
                ) : (
                  <>
                    Next Question
                    <span className="ml-2">→</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Session Stats Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {session.questions.filter((q) => q.isCorrect === true).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Correct
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {session.questions.filter((q) => q.isCorrect === false).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Incorrect
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">
              {session.questions.filter((q) => q.userAnswer === null).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Remaining
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;
