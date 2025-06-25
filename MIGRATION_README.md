# Flashcard Progress Migration Script

This Node.js script ensures that all existing users in `users.json` have proper `flashcardProgress` structure for their study sets, preventing undefined errors in the application.

## What it does

The migration script:

1. **Reads** the existing `private/users.json` file
2. **Creates a backup** at `private/users.json.backup`
3. **Iterates through each user** and their study sets
4. **Ensures** each study set has a corresponding `flashcardProgress` entry with:
   - `knownCards`: Array of known flashcard IDs
   - `unknownCards`: Array of unknown flashcard IDs  
   - `lastUpdated`: Timestamp of last update
5. **Validates** the migration results
6. **Provides detailed logging** of all changes made

## Usage

### Basic Migration
```bash
node migrate-flashcard-progress.js
```

### Validation Only
To check if the current data structure is valid without making changes:
```bash
node migrate-flashcard-progress.js --validate
```

### Dry Run (Placeholder)
```bash
node migrate-flashcard-progress.js --dry-run
```
*Note: Dry run mode is planned but not yet implemented*

## Expected Data Structure

### Before Migration
```json
{
  "user1": {
    "id": "user1",
    "username": "test",
    "progress": {
      "studySets": [
        {
          "id": "es",
          "totalSessions": 27,
          "bestScore": 100
        }
      ]
    },
    "flashcardProgress": {
      // May be missing entries for some study sets
    }
  }
}
```

### After Migration
```json
{
  "user1": {
    "id": "user1", 
    "username": "test",
    "progress": {
      "studySets": [
        {
          "id": "es",
          "totalSessions": 27,
          "bestScore": 100
        }
      ]
    },
    "flashcardProgress": {
      "es": {
        "knownCards": [],
        "unknownCards": [],
        "lastUpdated": "2025-01-15T10:30:00.000Z"
      }
    }
  }
}
```

## Safety Features

- **Automatic Backup**: Creates `users.json.backup` before making changes
- **Error Recovery**: Restores from backup if migration fails
- **Validation**: Checks migration results to ensure data integrity
- **Detailed Logging**: Shows exactly what changes are being made
- **Non-destructive**: Only adds missing data, never removes existing data

## Output Example

```
🔄 Flashcard Progress Migration Tool
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Starting flashcard progress migration...
📖 Reading users.json...
💾 Creating backup...
✅ Backup created at: N:\projects\web\fiszki\private\users.json.backup

👤 Processing user: user1
  📚 Found 1 study sets
    📖 Checking study set: es
      ✅ es already has valid flashcardProgress
  ✅ User user1 already valid

💾 Writing updated data to users.json...

📊 Migration Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Total users processed: 1
🔄 Users modified: 0
📚 Study sets processed: 1
✨ Study sets modified: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️  No changes needed - all users already have valid flashcardProgress
🗑️  Backup removed (no changes were made)

🔍 Validating migration results...
✅ Validation passed - all users have valid flashcardProgress structure
```

## Requirements

- Node.js (any recent version)
- Access to the `private/users.json` file
- Write permissions in the project directory

## Integration

The script can be:
- Run manually when needed
- Integrated into deployment scripts
- Called programmatically from other Node.js code:

```javascript
const { migrateFlashcardProgress, validateMigration } = require('./migrate-flashcard-progress');

// Run migration
migrateFlashcardProgress();

// Or just validate
validateMigration();
```
