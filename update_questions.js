const mysql = require('mysql2/promise');
require('dotenv').config();
const questions = require('./data/questions');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'coderealm'
  });

  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM Question');

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

    await connection.commit();
    console.log(`Inserted ${questions.length} Python Classes and Objects questions.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

run().catch(error => {
  console.error('Question update failed:', error.message);
  process.exit(1);
});
