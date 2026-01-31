import Database from 'better-sqlite3';

const db = new Database('sqlite.db');

try {
    console.log('Resetting ALL data including templates...');
    db.prepare('DELETE FROM quest_history').run();
    db.prepare('DELETE FROM quests').run();
    db.prepare('DELETE FROM quest_templates').run();
    console.log('Successfully deleted all records from "quests", "quest_history", and "quest_templates".');
    console.log('Users were preserved.');
} catch (error) {
    console.error('Error resetting data:', error);
}
