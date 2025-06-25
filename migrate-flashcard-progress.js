#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const USERS_JSON_PATH = path.join(__dirname, 'private', 'users.json');
const BACKUP_PATH = path.join(__dirname, 'private', 'users.json.backup');

/**
 * Migration script to ensure each study set has flashcardProgress 
 * with knownCards/unknownCards arrays to avoid undefined errors
 */
function migrateFlashcardProgress() {
    console.log('🚀 Starting flashcard progress migration...');
    
    try {
        // Check if users.json exists
        if (!fs.existsSync(USERS_JSON_PATH)) {
            console.log('❌ users.json not found at:', USERS_JSON_PATH);
            process.exit(1);
        }

        // Read the current users.json file
        console.log('📖 Reading users.json...');
        const usersData = JSON.parse(fs.readFileSync(USERS_JSON_PATH, 'utf8'));
        
        // Create backup
        console.log('💾 Creating backup...');
        fs.copyFileSync(USERS_JSON_PATH, BACKUP_PATH);
        console.log('✅ Backup created at:', BACKUP_PATH);

        let totalUsers = 0;
        let usersModified = 0;
        let studySetsProcessed = 0;
        let studySetsModified = 0;

        // Iterate through each user
        Object.keys(usersData).forEach(userId => {
            totalUsers++;
            const user = usersData[userId];
            let userModified = false;

            console.log(`\n👤 Processing user: ${userId}`);

            // Ensure user has flashcardProgress object
            if (!user.flashcardProgress) {
                user.flashcardProgress = {};
                userModified = true;
                console.log('  ➕ Added missing flashcardProgress object');
            }

            // Check if user has progress.studySets
            if (user.progress && user.progress.studySets && Array.isArray(user.progress.studySets)) {
                console.log(`  📚 Found ${user.progress.studySets.length} study sets`);

                // Iterate through each study set
                user.progress.studySets.forEach(studySet => {
                    studySetsProcessed++;
                    const studySetId = studySet.id;

                    console.log(`    📖 Checking study set: ${studySetId}`);

                    // Ensure flashcardProgress entry exists for this study set
                    if (!user.flashcardProgress[studySetId]) {
                        user.flashcardProgress[studySetId] = {
                            knownCards: [],
                            unknownCards: [],
                            lastUpdated: new Date().toISOString()
                        };
                        userModified = true;
                        studySetsModified++;
                        console.log(`      ✨ Created flashcardProgress for ${studySetId}`);
                    } else {
                        // Ensure required arrays exist
                        let studySetModified = false;
                        
                        if (!Array.isArray(user.flashcardProgress[studySetId].knownCards)) {
                            user.flashcardProgress[studySetId].knownCards = [];
                            studySetModified = true;
                            console.log(`      🔧 Fixed knownCards array for ${studySetId}`);
                        }
                        
                        if (!Array.isArray(user.flashcardProgress[studySetId].unknownCards)) {
                            user.flashcardProgress[studySetId].unknownCards = [];
                            studySetModified = true;
                            console.log(`      🔧 Fixed unknownCards array for ${studySetId}`);
                        }

                        if (!user.flashcardProgress[studySetId].lastUpdated) {
                            user.flashcardProgress[studySetId].lastUpdated = new Date().toISOString();
                            studySetModified = true;
                            console.log(`      🔧 Added lastUpdated timestamp for ${studySetId}`);
                        }

                        if (studySetModified) {
                            userModified = true;
                            studySetsModified++;
                        } else {
                            console.log(`      ✅ ${studySetId} already has valid flashcardProgress`);
                        }
                    }
                });
            } else {
                console.log('  ℹ️  No study sets found for this user');
            }

            if (userModified) {
                usersModified++;
                console.log(`  ✅ User ${userId} updated`);
            } else {
                console.log(`  ✅ User ${userId} already valid`);
            }
        });

        // Write the updated data back to users.json
        console.log('\n💾 Writing updated data to users.json...');
        fs.writeFileSync(USERS_JSON_PATH, JSON.stringify(usersData, null, 2), 'utf8');

        // Summary
        console.log('\n📊 Migration Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`👥 Total users processed: ${totalUsers}`);
        console.log(`🔄 Users modified: ${usersModified}`);
        console.log(`📚 Study sets processed: ${studySetsProcessed}`);
        console.log(`✨ Study sets modified: ${studySetsModified}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (usersModified > 0) {
            console.log('✅ Migration completed successfully!');
            console.log(`💾 Backup available at: ${BACKUP_PATH}`);
        } else {
            console.log('ℹ️  No changes needed - all users already have valid flashcardProgress');
            // Remove backup if no changes were made
            fs.unlinkSync(BACKUP_PATH);
            console.log('🗑️  Backup removed (no changes were made)');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Restore backup if it exists and migration failed
        if (fs.existsSync(BACKUP_PATH)) {
            try {
                fs.copyFileSync(BACKUP_PATH, USERS_JSON_PATH);
                console.log('🔄 Restored from backup due to error');
            } catch (restoreError) {
                console.error('❌ Failed to restore backup:', restoreError.message);
            }
        }
        
        process.exit(1);
    }
}

/**
 * Validate the migration results
 */
function validateMigration() {
    console.log('\n🔍 Validating migration results...');
    
    try {
        const usersData = JSON.parse(fs.readFileSync(USERS_JSON_PATH, 'utf8'));
        let allValid = true;
        
        Object.keys(usersData).forEach(userId => {
            const user = usersData[userId];
            
            // Check if user has flashcardProgress
            if (!user.flashcardProgress || typeof user.flashcardProgress !== 'object') {
                console.log(`❌ User ${userId} missing flashcardProgress object`);
                allValid = false;
                return;
            }
            
            // Check each study set
            if (user.progress && user.progress.studySets && Array.isArray(user.progress.studySets)) {
                user.progress.studySets.forEach(studySet => {
                    const studySetId = studySet.id;
                    const flashcardProgress = user.flashcardProgress[studySetId];
                    
                    if (!flashcardProgress) {
                        console.log(`❌ User ${userId}, study set ${studySetId} missing flashcardProgress`);
                        allValid = false;
                        return;
                    }
                    
                    if (!Array.isArray(flashcardProgress.knownCards)) {
                        console.log(`❌ User ${userId}, study set ${studySetId} knownCards is not an array`);
                        allValid = false;
                    }
                    
                    if (!Array.isArray(flashcardProgress.unknownCards)) {
                        console.log(`❌ User ${userId}, study set ${studySetId} unknownCards is not an array`);
                        allValid = false;
                    }
                });
            }
        });
        
        if (allValid) {
            console.log('✅ Validation passed - all users have valid flashcardProgress structure');
        } else {
            console.log('❌ Validation failed - some issues found');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

// Main execution
if (require.main === module) {
    console.log('🔄 Flashcard Progress Migration Tool');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check command line arguments
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('-d');
    const validateOnly = args.includes('--validate') || args.includes('-v');
    
    if (validateOnly) {
        validateMigration();
    } else if (dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made');
        console.log('ℹ️  This mode is not implemented yet, but would show what changes would be made');
        console.log('💡 Run without --dry-run to perform the actual migration');
    } else {
        migrateFlashcardProgress();
        validateMigration();
    }
}

module.exports = {
    migrateFlashcardProgress,
    validateMigration
};
