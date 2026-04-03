import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';
async function run() {
  const db = await getDb();
  await db.run(sql`DROP TABLE IF EXISTS bulletin_boards`);
  console.log('Dropped');
  process.exit(0);
}
run();
