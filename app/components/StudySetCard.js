/**
 * StudySetCard component for displaying study set information
 * Shows study set details, statistics, and action buttons
 */

"use client";

import Link from "next/link";
import { formatDate } from "../lib/utils.js";
import { formatDuration } from "../lib/types.js";
import { studySetToCSV } from "../lib/csvParser.js";

const StudySetCard = ({ studySet, onDelete, showActions = true }) => {
  const { id, name, description, questions, createdAt, updatedAt, stats } =
    studySet;

  const questionCount = questions?.length || 0;
  const hasQuestions = questionCount > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {name}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 dark:text-gray-400">📝</span>
            <span className="text-gray-600 dark:text-gray-300">
              {questionCount} question{questionCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 dark:text-gray-400">🎯</span>
            <span className="text-gray-600 dark:text-gray-300">
              {stats.totalSessions} session
              {stats.totalSessions !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 dark:text-gray-400">📊</span>
            <span className="text-gray-600 dark:text-gray-300">
              {stats.averageScore > 0 ? `${stats.averageScore}% avg` : "No avg yet"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 dark:text-gray-400">🏆</span>
            <span className="text-gray-600 dark:text-gray-300">
              {stats.bestScore > 0 ? `${stats.bestScore}% best` : "No best yet"}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="text-gray-500 dark:text-gray-400">⏱️</span>
          <span>
            Total time: {stats.totalTimeSpent > 0 ? formatDuration(stats.totalTimeSpent) : "No time yet"}
          </span>
        </div>
      </div>

      {/* Progress bar for best score */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Best Score Progress
          </span>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {stats.bestScore > 0 ? `${stats.bestScore}%` : "0%"}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ease-out ${
              stats.bestScore > 0 
                ? "bg-gradient-to-r from-blue-500 to-green-500" 
                : "bg-gray-300 dark:bg-gray-500"
            }`}
            style={{ width: `${stats.bestScore || 0}%` }}
          />
        </div>
      </div>

      {/* Footer with actions */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {createdAt && <span>Created {formatDate(createdAt)}</span>}
            {updatedAt && updatedAt !== createdAt && (
              <span className="ml-2">• Updated {formatDate(updatedAt)}</span>
            )}
          </div>

          <div className="flex space-x-2">
            {hasQuestions ? (
              <Link
                href={`/study/${id}`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 transition-colors"
              >
                <span className="mr-1">🎓</span>
                Study
              </Link>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-600 rounded-md cursor-not-allowed">
                <span className="mr-1">❌</span>
                No questions
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySetCard;
