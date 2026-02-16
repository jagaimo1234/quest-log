import * as dotenv from 'dotenv';
import { format, addDays } from "date-fns";
import * as fs from 'fs';

dotenv.config();

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync('verification_log.txt', msg + '\n');
}

async function verify() {
    fs.writeFileSync('verification_log.txt', 'Starting verification...\n');
    log("Starting verification...");

    try {
        // Dynamic import to ensure process.env is populated before db.ts is loaded
        const { getActiveQuests, getScheduledQuests, getQuestHistoryByDate, createQuest, getDb } = await import("../server/db");

        const db = await getDb();
        if (!db) {
            log("DB not connected");
            return;
        }

        // Use a test user ID (assuming 1 exists based on previous context, or fetch one)
        // Need to import users schema and drizzle-orm functions locally or use raw query if possible,
        // but to keep it simple, we'll try to use the exported functions if available, or just hardcode userId=1 if query fails.
        // Since we cannot easily import 'users' schema without adding more imports and likely causing issues,
        // we will try to just assume user ID 1 exists, or use a raw SQL query if getDb returns a client that supports it.

        // Actually, let's just use userId = 1 for verification as it's a dev environment.
        const userId = 1;
        log(`Using hardcoded User ID: ${userId}`);

        /*
        const users = await db.query.users.findMany({ limit: 1 });
        if (users.length === 0) {
            log("No users found to test with.");
            return;
        }
        const userId = users[0].id;
        */

        const today = new Date();
        const tomorrow = addDays(today, 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
        const todayStr = format(today, 'yyyy-MM-dd');

        log(`Testing for User ID: ${userId}, Today: ${todayStr} and Tomorrow: ${tomorrowStr}`);

        // 1. Create a scheduled quest for tomorrow
        log("Creating scheduled quest for tomorrow...");
        let newQuest;
        try {
            newQuest = await createQuest(userId, {
                questName: "Test Future Quest",
                questType: "Daily",
                startDate: tomorrow, // Date object
                status: "unreceived"
            });
            log(`Created Quest ID: ${newQuest.id}, StartDate: ${newQuest.startDate}`);
        } catch (e) {
            log(`Error creating quest: ${e}`);
            return;
        }

        // 3. Fetch scheduled quests for tomorrow
        log(`Fetching scheduled quests for ${tomorrowStr}...`);
        const scheduledValues = await getScheduledQuests(userId, tomorrowStr);
        log(`Found ${scheduledValues.length} quests.`);

        const found = scheduledValues.find(q => q.id === newQuest.id);
        if (found) {
            log("SUCCESS: Found newly created future quest.");
        } else {
            log("FAILURE: Did not find future quest.");
            log("Returned quests: " + JSON.stringify(scheduledValues.map(q => ({ id: q.id, name: q.questName, start: q.startDate }))));
        }

        // 4. Fetch scheduled quests for today (should NOT include tomorrow's quest)
        log(`Fetching scheduled quests for ${todayStr}...`);
        const todayValues = await getScheduledQuests(userId, todayStr);
        const foundInToday = todayValues.find(q => q.id === newQuest.id);
        if (!foundInToday) {
            log("SUCCESS: Future quest does NOT appear in today's list.");
        } else {
            log("FAILURE: Future quest appeared in today's list.");
        }

        log("Verification complete.");
    } catch (err) {
        log(`Fatal error: ${err}`);
        console.error(err);
    }
}

verify().catch((err) => {
    fs.appendFileSync('verification_log.txt', `Unhandled error: ${err}\n`);
    console.error(err);
});
