/**
 * SessionReport component for displaying session results and statistics
 * Shows detailed breakdown of performance, correct/incorrect answers, and analytics
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "../lib/utils.js";
import { formatDuration, calculateSessionStats } from "../lib/types.js";

const SessionReport = ({
  session,
  studySet,
  onRetakeSession,
  className = "",
}) => {
  const [showQuestionDetails, setShowQuestionDetails] = useState(false);

  if (!session || !session.completed) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">
          Session data not available or session not completed.
        </p>
      </div>
    );
  }

  const stats = calculateSessionStats(session);
  const scoreColor =
    stats.score >= 80
      ? "text-green-600 dark:text-green-400"
      : stats.score >= 60
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";
  const scoreBgColor =
    stats.score >= 80
      ? "bg-green-50 dark:bg-green-900/50"
      : stats.score >= 60
        ? "bg-yellow-50 dark:bg-yellow-900/50"
        : "bg-red-50 dark:bg-red-900/50";

  const getPerformanceMessage = () => {
    if (stats.score >= 90)
      return { message: "Excellent work! 🏆", emoji: "🎉" };
    if (stats.score >= 80) return { message: "Great job! 👏", emoji: "😊" };
    if (stats.score >= 70) return { message: "Good effort! 👍", emoji: "🙂" };
    if (stats.score >= 60)
      return { message: "Not bad, keep practicing!", emoji: "😐" };
    return { message: "Keep studying, you'll improve!", emoji: "💪" };
  };

  const performanceMessage = getPerformanceMessage();

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{performanceMessage.emoji}</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Session Complete!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          {performanceMessage.message}
        </p>
      </div>

      {/* Main Stats */}
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center ${scoreBgColor}`}
      >
        <div className="mb-6">
          <div className={`text-6xl font-bold ${scoreColor} mb-2`}>
            {stats.score}%
          </div>
          <div className="text-lg text-gray-600 dark:text-gray-300">
            Final Score
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.correctAnswers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Correct
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.totalQuestions - stats.correctAnswers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Incorrect
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-600 dark:text-gray-300">
              {stats.totalQuestions}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Total Questions
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Session Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Study Set:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {session.studySetName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Date:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(session.endTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Duration:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDuration(session.timeSpent)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Avg Time per Question:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {session.totalQuestions > 0
                  ? formatDuration(
                      Math.round(session.timeSpent / session.totalQuestions),
                    )
                  : "0s"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Performance Analysis
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Accuracy:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {stats.percentage}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Grade:</span>
              <span className={`font-medium ${scoreColor}`}>
                {stats.score >= 90
                  ? "A"
                  : stats.score >= 80
                    ? "B"
                    : stats.score >= 70
                      ? "C"
                      : stats.score >= 60
                        ? "D"
                        : "F"}
              </span>
            </div>
            {studySet && studySet.stats.bestScore && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Personal Best:
                </span>
                <span className="font-medium">
                  {stats.score > studySet.stats.bestScore ? (
                    <span className="text-green-600 dark:text-green-400">
                      🎉 New Best! ({stats.score}%)
                    </span>
                  ) : (
                    <span className="text-gray-900 dark:text-gray-100">
                      {studySet.stats.bestScore}%
                    </span>
                  )}
                </span>
              </div>
            )}
            {studySet && studySet.stats.averageScore > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Your Average:
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {studySet.stats.averageScore}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Score Breakdown
        </h3>
        <div className="relative">
          <div className="flex mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">0%</div>
            <div className="flex-1 text-center text-sm text-gray-600 dark:text-gray-400">
              50%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">100%</div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 relative">
            <div
              className={`h-4 rounded-full transition-all duration-1000 ${
                stats.score >= 80
                  ? "bg-green-500"
                  : stats.score >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${stats.score}%` }}
            />
            <div
              className="absolute top-0 w-2 h-4 bg-gray-800 dark:bg-gray-200 rounded"
              style={{ left: `calc(${stats.score}% - 4px)` }}
            />
          </div>
          <div className="text-center mt-2">
            <span className={`font-bold ${scoreColor}`}>{stats.score}%</span>
          </div>
        </div>
      </div>

      {/* Question by Question Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Question Details
          </h3>
          <button
            onClick={() => setShowQuestionDetails(!showQuestionDetails)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {showQuestionDetails ? "Hide Details" : "Show Details"}
          </button>
        </div>

        {showQuestionDetails && (
          <div className="space-y-4">
            {session.questions.map((question, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  question.isCorrect
                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/50"
                    : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/50"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-lg ${question.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {question.isCorrect ? "✓" : "✗"}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Question {index + 1}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {question.responseTime
                      ? formatDuration(question.responseTime)
                      : "No time recorded"}
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  {question.question}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {question.answers.map((answer, answerIndex) => (
                    <div
                      key={answerIndex}
                      className={`p-2 rounded border ${
                        question.correctIndices
                          ? question.correctIndices.includes(answerIndex)
                            ? "border-green-300 dark:border-green-600 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                            : question.userAnswer === answerIndex
                              ? "border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                              : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          : answerIndex === question.correctIndex
                            ? "border-green-300 dark:border-green-600 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                            : question.userAnswer === answerIndex
                              ? "border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                              : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <span className="font-medium">
                        {String.fromCharCode(65 + answerIndex)}:
                      </span>{" "}
                      {answer}
                      {(question.correctIndices
                        ? question.correctIndices.includes(answerIndex)
                        : answerIndex === question.correctIndex) && (
                        <span className="ml-2 text-green-600 dark:text-green-400 font-bold">
                          ✓ Correct
                        </span>
                      )}
                      {question.userAnswer === answerIndex &&
                        !(question.correctIndices
                          ? question.correctIndices.includes(answerIndex)
                          : answerIndex === question.correctIndex) && (
                          <span className="ml-2 text-red-600 dark:text-red-400 font-bold">
                            ✗ Your Answer
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetakeSession && (
            <button
              onClick={onRetakeSession}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            >
              <span className="mr-2">🔄</span>
              Retake Session
            </button>
          )}

          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
          >
            <span className="mr-2">🏠</span>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Study Tips */}
      {stats.score < 80 && (
        <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            💡 Study Tips
          </h3>
          <ul className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
            <li>
              • Review the questions you got wrong and understand why the
              correct answer is right
            </li>
            <li>• Take breaks between study sessions to help with retention</li>
            <li>
              • Try studying the material in smaller chunks over multiple days
            </li>
            <li>
              • Consider creating your own questions about the topic to test
              your understanding
            </li>
            {stats.averageResponseTime > 30 && (
              <li>
                • You might benefit from more practice - your average response
                time was {formatDuration(stats.averageResponseTime)}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SessionReport;
