# Fiszki - CSV Study App

A simple study application that lets you import questions from CSV files and practice with multiple choice quizzes.

## Features

- 📄 Import study sets from CSV files
- 🎯 Study with multiple choice questions
- 📊 View detailed session reports
- ⏱️ Track your progress and timing
- 🔄 Retake sessions to improve scores
- 🌙 Dark mode support with system preference detection

## CSV Format

Create your study sets using CSV files with the following format:

```
Question(;)Answer1(;)Answer2(;)Answer3(;)Answer4
```

**Important:** Mark correct answers with a `$` prefix. You can have multiple correct answers by adding `$` to multiple options.

### Example CSV:

```csv
What is the capital of France?(;)London(;)Berlin(;)$Paris(;)Madrid
Which planet is known as the Red Planet?(;)Venus(;)$Mars(;)Jupiter(;)Saturn
What is 2 + 2?(;)$4(;)3(;)5(;)6
Who wrote Romeo and Juliet?(;)$William Shakespeare(;)Charles Dickens(;)Mark Twain(;)Jane Austen
Which are primary colors?(;)$Red(;)$Blue(;)Green(;)$Yellow
Which programming languages are object-oriented?(;)$Java(;)$C++(;)Assembly(;)$Python
```

### CSV Rules:

1. Each line represents one question
2. First column: The question text
3. Next 4 columns: The answer options
4. Mark correct answers with `$` at the beginning (you can mark multiple answers as correct)
5. Use `(;)` as separators - no need to escape commas or semicolons in text
6. At least one answer must be marked as correct

## How to Use

1. **Import CSV**: Click "Import CSV" and select your CSV file
2. **Start Studying**: Click "Study" on any imported study set
3. **Configure Session**: Choose whether to shuffle questions/answers
4. **Answer Questions**: Select your answer and submit
5. **View Results**: See your score and detailed breakdown

## Study Session Options

- **Shuffle Questions**: Present questions in random order
- **Shuffle Answers**: Randomize answer positions for each question
- **Question Limit**: Study only a subset of questions

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

- Keep questions clear and concise
- For single-answer questions, ensure only one answer is obviously correct
- For multiple-answer questions, clearly indicate in the question that multiple answers are expected
- Make incorrect answers plausible but clearly wrong
- Test your CSV file with a small set first
- Use consistent formatting throughout

### Multiple Correct Answers

You can create questions with multiple correct answers by marking several options with `$`:

```csv
Which are European countries?(;)$France(;)$Germany(;)Brazil(;)$Italy
Select all even numbers?(;)$2(;)3(;)$4(;)7
Which are web browsers?(;)$Chrome(;)$Firefox(;)Photoshop(;)$Safari
```

When answering these questions, any of the marked correct answers will be accepted as correct.

---

**Note**: This app stores data locally in your browser. Your study sets and progress won't be shared or stored on external servers.