/**
 * FlashcardInterface component for studying flashcards
 * Handles card flipping, swipe gestures, and progress tracking
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatDuration } from "../lib/types.js";
import { flashcardStorage } from "../lib/storage.js";

const FlashcardInterface = ({
  session,
  currentUser,
  onAnswerQuestion,
  onCompleteSession,
  onAbandonSession,
  className = "",
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [cardStartTime, setCardStartTime] = useState(null);
  const [knownCards, setKnownCards] = useState(new Set());
  const [unknownCards, setUnknownCards] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCardChanging, setIsCardChanging] = useState(false);

  const cardRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const animationTimeoutRef = useRef(null);

  const currentCard = session.questions[currentCardIndex];
  const totalCards = session.questions.length;
  const isLastCard = currentCardIndex === totalCards - 1;
  const progress = ((currentCardIndex + 1) / totalCards) * 100;

  // Get card progress for current card
  const cardProgress = currentCard
    ? flashcardStorage.getCardProgress(
        session.studySetId,
        currentCard.questionId,
      )
    : null;

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

  // Set card start time when card changes
  useEffect(() => {
    setCardStartTime(new Date());
    // Reset all card states when changing to a new card
    setIsFlipped(false);
    setShowResult(false);
    setSwipeDirection(null);
    setDragOffset({ x: 0, y: 0 });
    setIsAnimating(false);

    // Clear any pending animations
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, [currentCardIndex]);

  // Handle card flip
  const handleCardFlip = () => {
    if (!isDragging && !showResult && !isAnimating && !isCardChanging) {
      setIsAnimating(true);
      setIsFlipped(!isFlipped);

      // Add subtle haptic feedback for flip
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }

      // Reset animation flag after flip completes
      setTimeout(() => setIsAnimating(false), 900);
    }
  };

  // Handle swipe gesture completion
  const handleSwipe = async (direction) => {
    if (isSubmitting || isAnimating) return;

    setIsSubmitting(true);
    setIsAnimating(true);
    setSwipeDirection(direction);

    try {
      // Calculate response time
      const responseTime = cardStartTime
        ? Math.floor((new Date() - cardStartTime) / 1000)
        : 0;

      // Determine if user knows the card (left = known, right = unknown)
      const isKnown = direction === "left";
      const isCorrect = isKnown;

      // Update card sets
      if (isKnown) {
        setKnownCards((prev) => new Set([...prev, currentCard.questionId]));
        setUnknownCards((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentCard.questionId);
          return newSet;
        });
      } else {
        setUnknownCards((prev) => new Set([...prev, currentCard.questionId]));
        setKnownCards((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentCard.questionId);
          return newSet;
        });
      }

      // Update flashcard progress tracking
      flashcardStorage.updateCardProgress(
        session.studySetId,
        currentCard.questionId,
        isKnown,
        responseTime,
      );

      // Update the current card with response time and proper structure
      const updatedCard = {
        ...currentCard,
        startTime: cardStartTime?.toISOString(),
        responseTime,
        isCorrect,
        userAnswer: isKnown ? "known" : "unknown",
        type: "flashcard",
      };

      // Update the session question in place
      const updatedSession = { ...session };
      updatedSession.questions[currentCardIndex] = updatedCard;

      const result = await onAnswerQuestion(currentCardIndex, isKnown ? 1 : 0);

      if (result.success) {
        setShowResult(true);

        // Auto-advance to next card after showing result
        animationTimeoutRef.current = setTimeout(() => {
          setIsCardChanging(true);
          setIsFlipped(false);
          setIsAnimating(false);

          setTimeout(() => {
            if (isLastCard) {
              // Ensure the last card's state is saved before completing session
              setTimeout(() => {
                handleCompleteSession();
              }, 100);
            } else {
              setCurrentCardIndex((prev) => prev + 1);
            }
            // Delay to allow fade-in effect
            setTimeout(() => {
              setIsCardChanging(false);
            }, 50);
          }, 150);
        }, 800);
      }
    } catch (error) {
      console.error("Failed to process swipe:", error);
      setIsAnimating(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Touch event handlers
  const handleTouchStart = (e) => {
    if (isAnimating || isSubmitting) return;

    e.preventDefault();
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    currentPos.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || isAnimating) return;

    e.preventDefault();
    const touch = e.touches[0];
    currentPos.current = { x: touch.clientX, y: touch.clientY };

    const deltaX = currentPos.current.x - startPos.current.x;
    const deltaY = currentPos.current.y - startPos.current.y;

    // Apply some resistance to vertical movement
    const resistedY = deltaY * 0.3;

    setDragOffset({ x: deltaX, y: resistedY });
  };

  const handleTouchEnd = (e) => {
    if (!isDragging) return;

    e.preventDefault();
    const deltaX = currentPos.current.x - startPos.current.x;
    const deltaY = currentPos.current.y - startPos.current.y;
    const threshold = 80; // Increased threshold to prevent accidental triggers
    const minDistance = 100; // Minimum distance for any swipe
    const velocity = Math.abs(deltaX) / 80; // Adjusted velocity calculation

    // Check if this is an intentional swipe (more horizontal than vertical)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

    setIsDragging(false);

    if (
      isHorizontalSwipe &&
      Math.abs(deltaX) > threshold &&
      (Math.abs(deltaX) > minDistance || velocity > 0.8)
    ) {
      // Haptic feedback simulation (vibration if available)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      const direction = deltaX > 0 ? "right" : "left";
      handleSwipe(direction);
    } else {
      // Smooth snap back to center with spring animation
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Mouse event handlers (for desktop)
  const handleMouseDown = (e) => {
    if (isAnimating || isSubmitting) return;

    e.preventDefault();
    startPos.current = { x: e.clientX, y: e.clientY };
    currentPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isAnimating) return;

    e.preventDefault();
    currentPos.current = { x: e.clientX, y: e.clientY };

    const deltaX = currentPos.current.x - startPos.current.x;
    const deltaY = currentPos.current.y - startPos.current.y;

    // Apply resistance to vertical movement
    const resistedY = deltaY * 0.3;

    setDragOffset({ x: deltaX, y: resistedY });
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;

    e.preventDefault();
    const deltaX = currentPos.current.x - startPos.current.x;
    const deltaY = currentPos.current.y - startPos.current.y;
    const threshold = 100; // Increased threshold for mouse interactions
    const minDistance = 70; // Minimum distance for mouse swipe

    // Check if this is an intentional swipe (more horizontal than vertical)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

    setIsDragging(false);

    if (
      isHorizontalSwipe &&
      Math.abs(deltaX) > threshold &&
      Math.abs(deltaX) > minDistance
    ) {
      const direction = deltaX > 0 ? "right" : "left";
      handleSwipe(direction);
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handleCompleteSession = async () => {
    try {
      // Get all cards from the session
      const allSessionCardIds = session.questions.map(q => q.questionId);
      
      // Instead of relying on state, get the answers directly from session questions
      // This is more reliable as it reflects the actual answered state
      const sessionKnownCards = [];
      const sessionUnknownCards = [];
      const unclassifiedCards = [];
      
      session.questions.forEach(question => {
        if (question.userAnswer === "known") {
          sessionKnownCards.push(question.questionId);
        } else if (question.userAnswer === "unknown") {
          sessionUnknownCards.push(question.questionId);
        } else {
          // This should not happen if all cards were answered
          unclassifiedCards.push(question.questionId);
        }
      });
      
      // Get previous progress
      const previousProgress = currentUser?.flashcardProgress?.[session.studySetId] || {};
      const previousKnown = new Set(previousProgress.knownCards || []);
      const previousUnknown = new Set(previousProgress.unknownCards || []);
      
      console.log('Debug - Session completion:');
      console.log('All session cards:', allSessionCardIds);
      console.log('Session known cards:', sessionKnownCards);
      console.log('Session unknown cards:', sessionUnknownCards);
      console.log('Unclassified cards:', unclassifiedCards);
      console.log('Previous known:', Array.from(previousKnown));
      console.log('Previous unknown:', Array.from(previousUnknown));

      // A. Create mutable copies of previous state
      const newKnown = new Set(previousKnown);
      const newUnknown = new Set(previousUnknown);
      
      // B. Loop through session.questions and update the sets
      session.questions.forEach(question => {
        const id = question.questionId;
        if (question.userAnswer === "known") {
          newKnown.add(id);
          newUnknown.delete(id);
        } else if (question.userAnswer === "unknown") {
          newUnknown.add(id);
          newKnown.delete(id);
        }
      });
      
      // C. Delta computation: compare previous vs new state for each session question
      const knownAdd = [];
      const knownRemove = [];
      const unknownAdd = [];
      const unknownRemove = [];
      
      session.questions.forEach(question => {
        const id = question.questionId;
        
        // Compare membership in previous vs new sets
        const wasKnown = previousKnown.has(id);
        const wasUnknown = previousUnknown.has(id);
        const isNowKnown = newKnown.has(id);
        const isNowUnknown = newUnknown.has(id);
        
        // Push to appropriate delta arrays
        if (!wasKnown && isNowKnown) {
          knownAdd.push(id);
        }
        if (wasKnown && !isNowKnown) {
          knownRemove.push(id);
        }
        if (!wasUnknown && isNowUnknown) {
          unknownAdd.push(id);
        }
        if (wasUnknown && !isNowUnknown) {
          unknownRemove.push(id);
        }
      });
      
      // Create flashcard updates object with deltas
      const flashcardUpdates = {
        knownAdd,
        knownRemove,
        unknownAdd,
        unknownRemove
      };
      
      console.log('Debug - Flashcard updates:', flashcardUpdates);
      
      const result = await onCompleteSession(flashcardUpdates);
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

  // Calculate card transform based on drag offset and swipe direction
  const getCardTransform = () => {
    if (showResult && swipeDirection) {
      const exitX = swipeDirection === "left" ? -500 : 500;
      const exitRotation = swipeDirection === "left" ? -45 : 45;
      return `translateX(${exitX}px) translateY(-100px) rotate(${exitRotation}deg) scale(0.8)`;
    }

    if (isDragging) {
      const isHorizontalSwipe =
        Math.abs(dragOffset.x) > Math.abs(dragOffset.y) * 1.5;
      const distance = Math.abs(dragOffset.x);

      if (isHorizontalSwipe && distance > 50) {
        // Valid swipe gesture - full transform effects
        const rotation = Math.max(-25, Math.min(25, dragOffset.x / 12));
        const scale = Math.max(0.92, 1 - distance / 600);
        const lift = Math.min(10, distance / 20);
        return `translateX(${dragOffset.x}px) translateY(${dragOffset.y - lift}px) rotate(${rotation}deg) scale(${scale})`;
      } else {
        // Small movement - minimal transform effects
        const rotation = Math.max(-5, Math.min(5, dragOffset.x / 30));
        const scale = Math.max(0.98, 1 - distance / 1200);
        return `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg) scale(${scale})`;
      }
    }

    // In-place animation - no transforms during card changes
    return "translateX(0px) translateY(0px) rotate(0deg) scale(1)";
  };

  // Get card opacity and blur based on state
  const getCardOpacity = () => {
    if (showResult) return 0;
    if (isCardChanging) return 0; // Start hidden for fade-in effect
    if (isDragging) {
      const distance = Math.abs(dragOffset.x);
      const isHorizontalSwipe =
        Math.abs(dragOffset.x) > Math.abs(dragOffset.y) * 1.5;

      // If it's a valid swipe gesture, reduce opacity more
      if (isHorizontalSwipe && distance > 50) {
        return Math.max(0.7, 1 - distance / 300);
      }
      // For small movements, only slightly reduce opacity
      return Math.max(0.95, 1 - distance / 800);
    }
    return 1;
  };

  // Get blur filter for card transitions
  const getCardFilter = () => {
    if (isCardChanging) return "blur(20px)"; // Blur during transition
    return "none";
  };

  // Get background hint color based on drag direction
  const getHintColor = () => {
    if (
      !isDragging ||
      Math.abs(dragOffset.x) < 50 ||
      Math.abs(dragOffset.x) <= Math.abs(dragOffset.y) * 1.5
    ) {
      return "transparent";
    }

    if (dragOffset.x > 0) {
      // Dragging right (don't know)
      const intensity = Math.min(Math.abs(dragOffset.x) / 150, 0.3);
      return `rgba(239, 68, 68, ${intensity})`; // Red tint
    } else {
      // Dragging left (know it)
      const intensity = Math.min(Math.abs(dragOffset.x) / 150, 0.3);
      return `rgba(34, 197, 94, ${intensity})`; // Green tint
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleAbandonSession}
              className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {session.studySetName}
            </h2>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatDuration(timeElapsed)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Card {currentCardIndex + 1} of {totalCards}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{knownCards.size} known</span>
            </div>
            <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{unknownCards.size} learning</span>
            </div>
            {cardProgress && cardProgress.timesReviewed > 0 && (
              <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  {Math.round((1 - cardProgress.difficulty) * 100)}% confidence
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gray-50 dark:bg-gray-900">
        <div className="relative w-full max-w-md sm:max-w-lg">
          {/* Swipe Hints */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full pt-4 flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 z-10">
            <div className="flex items-center space-x-2 opacity-75">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span>← Know it</span>
            </div>
            <div className="flex items-center space-x-2 opacity-75">
              <span>Don&apos;t know →</span>
              <div className="w-6 h-6 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-red-600 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          {/* Drag Feedback */}
          {isDragging &&
            Math.abs(dragOffset.x) > 50 &&
            Math.abs(dragOffset.x) > Math.abs(dragOffset.y) * 1.5 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div
                  className={`text-4xl font-bold transition-all duration-100 ${
                    dragOffset.x > 0
                      ? "text-red-500 transform rotate-12"
                      : "text-green-500 transform -rotate-12"
                  }`}
                >
                  {dragOffset.x > 0 ? "✗" : "✓"}
                </div>
              </div>
            )}
          {/* Flashcard */}
          <div
            ref={cardRef}
            className="relative w-full h-72 sm:h-80 select-none"
            style={{
              perspective: "1200px",
              perspectiveOrigin: "center center",
              backgroundColor: getHintColor(),
              borderRadius: "16px",
              transition: isDragging ? "none" : "background-color 0.3s ease",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className={`absolute inset-0 cursor-pointer ${isSubmitting || isAnimating || isCardChanging ? "pointer-events-none" : ""} ${isAnimating ? "flipping" : ""}`}
              style={{
                transform: getCardTransform(),
                opacity: getCardOpacity(),
                filter: getCardFilter(),
                transformStyle: "preserve-3d",
                transition: isDragging
                  ? "none"
                  : showResult
                    ? "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                    : isCardChanging
                      ? "opacity 0.8s ease-out, filter 0.8s ease-out"
                      : isAnimating
                        ? "transform 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55)"
                        : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
              onClick={handleCardFlip}
            >
              {/* Card Front */}
              <div
                className={`absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-8 flex items-center justify-center backface-hidden ${isCardChanging ? "opacity-50 scale-95" : ""} hover:shadow-2xl`}
                style={{
                  transform: isFlipped ? "rotateY(-180deg)" : "rotateY(0deg)",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transition: isCardChanging
                    ? "none"
                    : "transform 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
                }}
              >
                <div className="text-center px-2">
                  <div className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4 leading-relaxed break-words">
                    {currentCard.question}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-center space-x-2">
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                      />
                    </svg>
                    <span>Tap to see answer or swipe to respond directly</span>
                  </div>
                  {cardProgress && cardProgress.timesReviewed > 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 rounded-full px-3 py-1 inline-block">
                      {cardProgress.timesReviewed} reviews •{" "}
                      {Math.round(
                        (cardProgress.timesCorrect /
                          cardProgress.timesReviewed) *
                          100,
                      )}
                      % accuracy
                    </div>
                  )}
                </div>
              </div>

              {/* Card Back */}
              <div
                className={`absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl shadow-xl border border-blue-200 dark:border-blue-700 p-4 sm:p-8 flex items-center justify-center backface-hidden ${isCardChanging ? "opacity-50 scale-95" : ""} hover:shadow-2xl`}
                style={{
                  transform: isFlipped ? "rotateY(0deg)" : "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transition: isCardChanging
                    ? "none"
                    : "transform 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
                }}
              >
                <div className="text-center px-2">
                  <div className="text-lg sm:text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4 leading-relaxed break-words">
                    {currentCard.answer}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 flex items-center justify-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16l-4-4m0 0l4-4m-4 4h18"
                      />
                    </svg>
                    <span>Swipe to answer</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Action Buttons (always visible) */}
          <div className="flex justify-center space-x-2 sm:space-x-3 mt-4 sm:mt-6">
            <button
              onClick={() => handleSwipe("left")}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-full text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Know it</span>
            </button>
            <button
              onClick={() => handleSwipe("right")}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-full text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Don&apos;t know</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSS for card flip animation and enhanced interactions */}
      <style jsx>{`
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          -moz-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes flipIn {
          0% {
            transform: rotateY(90deg) scale(0.9);
            opacity: 0.8;
          }
          50% {
            transform: rotateY(45deg) scale(0.95);
            opacity: 0.9;
          }
          100% {
            transform: rotateY(0deg) scale(1);
            opacity: 1;
          }
        }
        @keyframes flipOut {
          0% {
            transform: rotateY(0deg) scale(1);
            opacity: 1;
          }
          50% {
            transform: rotateY(-45deg) scale(0.95);
            opacity: 0.9;
          }
          100% {
            transform: rotateY(-90deg) scale(0.9);
            opacity: 0.8;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes springBack {
          0% {
            transform: scale(0.95);
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
          }
        }
        .spring-back {
          animation: springBack 0.3s ease-out;
        }
        @keyframes cardEnter {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .card-enter {
          animation: cardEnter 0.4s ease-out;
        }
        @keyframes flipCard {
          0% {
            transform: rotateY(0deg) scale(1);
          }
          30% {
            transform: rotateY(70deg) scale(0.95);
          }
          70% {
            transform: rotateY(110deg) scale(0.9);
          }
          100% {
            transform: rotateY(180deg) scale(1);
          }
        }
        .flip-animation {
          animation: flipCard 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        @keyframes cardBounce {
          0%,
          100% {
            transform: scale(1) rotateY(0deg);
          }
          20% {
            transform: scale(1.05) rotateY(0deg);
          }
          40% {
            transform: scale(0.95) rotateY(0deg);
          }
          60% {
            transform: scale(1.02) rotateY(0deg);
          }
          80% {
            transform: scale(0.98) rotateY(0deg);
          }
        }
        .bounce-flip {
          animation: cardBounce 0.6s ease-out;
        }
        .flipping {
          filter: brightness(1.1);
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.3);
        }
        @keyframes flipGlow {
          0%,
          100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.15);
          }
        }
        .flip-glow {
          animation: flipGlow 0.9s ease-in-out;
        }
        .card-shadow {
          box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .card-shadow-hover {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        /* Enhanced 3D flip effects */
        .card-3d {
          transform-style: preserve-3d;
          perspective: 1000px;
        }
        .card-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          -moz-backface-visibility: hidden;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-front {
          transform: rotateY(0deg);
        }
        .card-back {
          transform: rotateY(180deg);
        }
        .card-flipped .card-front {
          transform: rotateY(-180deg);
        }
        .card-flipped .card-back {
          transform: rotateY(0deg);
        }
      `}</style>
    </div>
  );
};

export default FlashcardInterface;
