import 'dotenv/config';
import { createClient } from '@libsql/client';

async function addDisplayOrder() {
    const client = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
    try {
        await client.execute('ALTER TABLE quest_templates ADD COLUMN displayOrder INTEGER DEFAULT 0 NOT NULL');
        console.log('Column added');
    } catch (e: any) {
        if (e.message?.includes('duplicate column')) {
            console.log('Column already exists, skipping ALTER');
        } else {
            throw e;
        }
    }
    const rows = await client.execute('SELECT id FROM quest_templates ORDER BY id ASC');
    for (let i = 0; i < rows.rows.length; i++) {
        await client.execute({ sql: 'UPDATE quest_templates SET displayOrder = ? WHERE id = ?', args: [i, rows.rows[i].id] });
    }
    console.log('Done! Initialized', rows.rows.length, 'rows');
    client.close();
}

addDisplayOrder();
