const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const questions = require('../data/questions');
require('dotenv').config();

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schema);
    await connection.changeUser({ database: process.env.DB_NAME || 'coderealm' });

    const adminPassword = await bcrypt.hash('admin123', 10);
    await connection.query(
      `INSERT INTO User (username, email, password, role) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE username = username`,
      ['admin', 'admin@coderealm.com', adminPassword, 'admin']
    );

    const [existingQuestions] = await connection.query('SELECT COUNT(*) AS count FROM Question');
    if (existingQuestions[0].count === 0) {
      for (const question of questions) {
        const [result] = await connection.query(
          'INSERT INTO Question (questiontext, concept, difficulty, mark) VALUES (?, ?, ?, ?)',
          [question.text, question.concept, question.difficulty, question.mark]
        );
        for (const answer of question.answers) {
          await connection.query(
            'INSERT INTO Answer (questionid, answertext, iscorrect) VALUES (?, ?, ?)',
            [result.insertId, answer.text, answer.correct ? 1 : 0]
          );
        }
      }
      console.log(`Seeded ${questions.length} Python Classes and Objects questions.`);
    }

    const [existingEvents] = await connection.query('SELECT COUNT(*) AS count FROM GameEvent');
    if (existingEvents[0].count === 0) {
      const events = [
        ['monster', 'A Bug Beast appears! Use your Python Classes and Objects knowledge to defeat it.', 'classes_objects'],
        ['treasure', 'You found a Knowledge Chest! Answer a Python class question to claim it.', 'classes_objects'],
        ['trap', 'An Attribute Trap activates! Answer correctly to disarm it.', 'classes_objects'],
        ['rest', 'You found a Safe Haven. Rest and recover.', null],
        ['boss', 'The Final Class Master appears! This is the ultimate challenge.', 'classes_objects']
      ];
      for (const [eventtype, description, concept] of events) {
        await connection.query(
          'INSERT INTO GameEvent (eventtype, description, concept) VALUES (?, ?, ?)',
          [eventtype, description, concept]
        );
      }
    }

    console.log('Database setup complete.');
  } finally {
    await connection.end();
  }
}

setupDatabase().catch(error => {
  console.error('Database setup failed:', error.message);
  process.exit(1);
});
