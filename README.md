# Fiszki - CSV Study App

A simple study application that lets you import questions from CSV files and practice with multiple choice quizzes or interactive flashcards.

## Features

- 📄 Import study sets from CSV files
- 🎯 Study with multiple choice questions
- 🃏 Interactive flashcards with swipe gestures
- 📊 View detailed session reports
- ⏱️ Track your progress and timing
- 🔄 Retake sessions to improve scores
- 🧠 Spaced repetition algorithm for flashcards
- 📈 Individual card progress tracking
- 🌙 Dark mode support with system preference detection

## CSV Formats

Fiszki supports two CSV formats for different study modes:

### 1. Multiple Choice Questions

Create multiple choice questions using this format:

```
Question(;)Answer1(;)Answer2(;)Answer3(;)Answer4
```

**Important:** Mark correct answers with a `$` prefix. You can have multiple correct answers by adding `$` to multiple options.

### 2. Flashcards

Create simple flashcards using this format:

```
Question(;)Answer
```

This format is perfect for vocabulary, definitions, facts, and any simple question-answer pairs.

### Example Multiple Choice CSV:

```csv
What is the capital of France?(;)London(;)Berlin(;)$Paris(;)Madrid
Which planet is known as the Red Planet?(;)Venus(;)$Mars(;)Jupiter(;)Saturn
What is 2 + 2?(;)$4(;)3(;)5(;)6
Who wrote Romeo and Juliet?(;)$William Shakespeare(;)Charles Dickens(;)Mark Twain(;)Jane Austen
Which are primary colors?(;)$Red(;)$Blue(;)Green(;)$Yellow
Which programming languages are object-oriented?(;)$Java(;)$C++(;)Assembly(;)$Python
```

### Example Flashcard CSV:

```csv
What is the capital of France?(;)Paris
What is 2 + 2?(;)4
Who wrote Romeo and Juliet?(;)William Shakespeare
What does HTML stand for?(;)HyperText Markup Language
What is the chemical symbol for gold?(;)Au
What is the largest ocean on Earth?(;)Pacific Ocean
```

### CSV Rules:

**Multiple Choice Questions:**
1. Each line represents one question
2. First column: The question text
3. Next 4 columns: The answer options
4. Mark correct answers with `$` at the beginning (you can mark multiple answers as correct)
5. Use `(;)` as separators - no need to escape commas or semicolons in text
6. At least one answer must be marked as correct

**Flashcards:**
1. Each line represents one flashcard
2. First column: The question or term
3. Second column: The answer or definition
4. Use `(;)` as the separator
5. Both question and answer must be non-empty

## How to Use

1. **Import CSV**: Place your CSV files in the `private/study_sets` directory
2. **Start Studying**: Click "Study" on any imported study set
3. **Configure Session**: Choose your study options
4. **Study Mode**: The app automatically detects whether your CSV contains flashcards or multiple choice questions
5. **Answer Questions**: Select answers or swipe flashcards
6. **View Results**: See your score and detailed breakdown

## Study Session Options

- **Shuffle Questions**: Present questions in random order
- **Shuffle Answers**: Randomize answer positions (multiple choice only)
- **Question Limit**: Study only a subset of questions

## Flashcard Study Mode

When studying flashcards, you get an interactive experience:

### Features:
- **Card Flipping**: Tap or click cards to reveal answers
- **Swipe Gestures**: 
  - Swipe left (or click "I know it") if you know the answer
  - Swipe right (or click "I don't know it") if you need to study more
- **Progress Tracking**: Each card tracks your confidence level and review history
- **Spaced Repetition**: Cards you struggle with appear more frequently
- **Difficulty Assessment**: The app learns which cards are harder for you

### Progress Indicators:
- **Known Cards**: Cards you've marked as "known"
- **Learning Cards**: Cards you're still studying
- **Confidence Level**: Shows how well you know each card (0-100%)
- **Review History**: Tracks how many times you've seen each card and your accuracy

## Session Reports

After completing a study session, you'll see:

- Final score and grade
- Time spent and average time per question
- Question-by-question breakdown
- Study tips for improvement

## Getting Started

1. Download the sample CSV file from the app
2. Modify it with your own questions
3. Import and start studying!

## Dark Mode

The app includes a comprehensive dark mode implementation:

- **Theme Toggle**: Click the theme button in the navigation bar to cycle between light, dark, and system modes
- **System Preference**: Automatically detects your system's theme preference when set to "system" mode
- **Persistent Settings**: Your theme preference is saved and remembered across browser sessions
- **Smooth Transitions**: All theme changes include smooth color transitions for a polished experience

### Theme Options:
- ☀️ **Light Mode**: Traditional light theme with white backgrounds
- 🌙 **Dark Mode**: Dark theme with gray/black backgrounds, easy on the eyes
- 💻 **System Mode**: Automatically follows your operating system's theme preference

## Tips for Creating Good Study Sets

### Multiple Choice Questions:
- Keep questions clear and concise
- For single-answer questions, ensure only one answer is obviously correct
- For multiple-answer questions, clearly indicate in the question that multiple answers are expected
- Make incorrect answers plausible but clearly wrong
- Test your CSV file with a small set first
- Use consistent formatting throughout

### Flashcards:
- Keep questions/terms and answers/definitions concise
- Use consistent formatting (e.g., always put the term first, definition second)
- For language learning: put the foreign word first, translation second (or vice versa)
- For definitions: put the concept first, explanation second
- Avoid overly complex answers that are hard to remember
- Break complex topics into multiple simple cards

### Multiple Correct Answers (Multiple Choice Only)

You can create questions with multiple correct answers by marking several options with `$`:

```csv
Which are European countries?(;)$France(;)$Germany(;)Brazil(;)$Italy
Select all even numbers?(;)$2(;)3(;)$4(;)7
Which are web browsers?(;)$Chrome(;)$Firefox(;)Photoshop(;)$Safari
```

When answering these questions, any of the marked correct answers will be accepted as correct.

## Choosing Between Formats

**Use Flashcards when:**
- Learning vocabulary or terminology
- Memorizing facts, dates, or formulas
- Studying definitions
- Quick review sessions
- You want spaced repetition benefits

**Use Multiple Choice when:**
- Testing comprehension and reasoning
- Practicing for exams with multiple choice format
- Learning to distinguish between similar concepts
- You want to provide context through wrong answers

## Spaced Repetition Algorithm

For flashcards, Fiszki uses a modified SM-2 spaced repetition algorithm:

- **Difficulty Assessment**: Each card has a difficulty rating (0-1, where 1 is hardest)
- **Review Intervals**: Successfully recalled cards appear less frequently
- **Struggling Cards**: Cards you get wrong appear more often
- **Ease Factor**: Adjusts based on your response speed and accuracy
- **Optimal Timing**: Reviews cards just before you're likely to forget them

This ensures you spend more time on challenging material and less time on concepts you've mastered.

---

**Note**: This app stores data locally in your browser. Your study sets and progress won't be shared or stored on external servers.