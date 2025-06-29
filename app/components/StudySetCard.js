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
  const { id, name, questions, createdAt, updatedAt, stats } = studySet;

  const questionCount = questions?.length || 0;
  const hasQuestions = questionCount > 0;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {name}
            </h3>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">📝</span>
            <span className="text-gray-600">
              {questionCount} question{questionCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">🎯</span>
            <span className="text-gray-600">
              {stats.totalSessions} session
              {stats.totalSessions !== 1 ? "s" : ""}
            </span>
          </div>
          {stats.averageScore > 0 && (
            <>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">📊</span>
                <span className="text-gray-600">{stats.averageScore}% avg</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">🏆</span>
                <span className="text-gray-600">{stats.bestScore}% best</span>
              </div>
            </>
          )}
        </div>

        {stats.totalTimeSpent > 0 && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
            <span className="text-gray-500">⏱️</span>
            <span>Total time: {formatDuration(stats.totalTimeSpent)}</span>
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {createdAt && <span>Created {formatDate(createdAt)}</span>}
            {updatedAt && updatedAt !== createdAt && (
              <span className="ml-2">• Updated {formatDate(updatedAt)}</span>
            )}
          </div>

          <div className="flex space-x-2">
            {hasQuestions ? (
              <Link
                href={`/study/${id}`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <span className="mr-1">🎓</span>
                Study
              </Link>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded-md cursor-not-allowed">
                <span className="mr-1">❌</span>
                No questions
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar for best score */}
      {stats.bestScore > 0 && (
        <div className="px-6 pb-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${stats.bestScore}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudySetCard;
