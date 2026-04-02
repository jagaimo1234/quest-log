import 'dotenv/config';
import { createClient } from '@libsql/client';

async function resetUnreceivedTimeSlots() {
    const client = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
    try {
        const result = await client.execute('UPDATE quests SET plannedTimeSlot = NULL WHERE status = "unreceived" AND plannedTimeSlot IS NOT NULL');
        console.log(`Reset plannedTimeSlot for ${result.rowsAffected} unreceived quests.`);
    } catch (e: any) {
        console.error('Error:', e.message);
    }
    client.close();
}

resetUnreceivedTimeSlots();
