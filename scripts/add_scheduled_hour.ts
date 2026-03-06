import 'dotenv/config';
import { createClient } from '@libsql/client';

async function addScheduledHour() {
    const client = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
    try {
        await client.execute('ALTER TABLE quest_templates ADD COLUMN scheduledHour INTEGER');
        console.log('✓ Column scheduledHour added to quest_templates');
    } catch (e: any) {
        if (e.message?.includes('duplicate column')) {
            console.log('Column already exists, skipping');
        } else throw e;
    }
    const count = await client.execute('SELECT COUNT(*) as c FROM quest_templates WHERE questType = "Daily"');
    console.log(`Daily templates: ${count.rows[0].c}`);
    console.log('✅ Done!');
    client.close();
}

addScheduledHour();
