const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'coderealm'
    });

    await connection.query('DELETE FROM Question');
    console.log('Cleared existing questions');

    const questions = [
      // If/Else Statements
      {
        text: 'What will be the output of an if-statement if the condition is evaluated to false?',
        concept: 'if_else',
        difficulty: 'easy',
        mark: 10,
        answers: [
          { text: 'The block inside the if-statement is skipped entirely', correct: true },
          { text: 'The program crashes immediately', correct: false },
          { text: 'It runs the if-block infinitely', correct: false },
          { text: 'It automatically runs the if-block once anyway', correct: false }
        ]
      },
      {
        text: 'In an if-else if-else chain, how many blocks of code can be executed at maximum?',
        concept: 'if_else',
        difficulty: 'medium',
        mark: 15,
        answers: [
          { text: 'Exactly one block', correct: true },
          { text: 'All blocks where the condition is true', correct: false },
          { text: 'Only the else block', correct: false },
          { text: 'As many as there are true conditions', correct: false }
        ]
      },
      {
        text: 'What is the ternary operator `? :` used for?',
        concept: 'if_else',
        difficulty: 'medium',
        mark: 15,
        answers: [
          { text: 'As a shorthand for a simple if-else statement', correct: true },
          { text: 'To create a loop that runs three times', correct: false },
          { text: 'To handle runtime errors', correct: false },
          { text: 'To define three different variables', correct: false }
        ]
      },
      {
        text: 'Which operator is typically used in an if-statement to check if two values are equal?',
        concept: 'if_else',
        difficulty: 'easy',
        mark: 10,
        answers: [
          { text: '==', correct: true },
          { text: '=', correct: false },
          { text: '!=', correct: false },
          { text: '&&', correct: false }
        ]
      },

      // Loops - For/While
      {
        text: 'Which loop is guaranteed to execute its code block at least once, regardless of the condition?',
        concept: 'loops',
        difficulty: 'medium',
        mark: 15,
        answers: [
          { text: 'do-while loop', correct: true },
          { text: 'for loop', correct: false },
          { text: 'while loop', correct: false },
          { text: 'infinite loop', correct: false }
        ]
      },
      {
        text: 'What does the "continue" statement do when placed inside a loop?',
        concept: 'loops',
        difficulty: 'medium',
        mark: 15,
        answers: [
          { text: 'Skips the rest of the current iteration and jumps to the next iteration', correct: true },
          { text: 'Exits the loop entirely and continues executing the rest of the program', correct: false },
          { text: 'Pauses the execution for a few seconds', correct: false },
          { text: 'Restarts the entire program from the beginning', correct: false }
        ]
      },
      {
        text: 'What are the three main components typically found in a standard "for" loop declaration?',
        concept: 'loops',
        difficulty: 'easy',
        mark: 10,
        answers: [
          { text: 'Initialization, Condition, Increment/Decrement', correct: true },
          { text: 'Start, Middle, End', correct: false },
          { text: 'Variable, Array, Function', correct: false },
          { text: 'Try, Catch, Finally', correct: false }
        ]
      },
      {
        text: 'What happens if a while loop condition always evaluates to true and there is no break statement?',
        concept: 'loops',
        difficulty: 'easy',
        mark: 10,
        answers: [
          { text: 'The loop will run infinitely until the program is forcefully stopped or crashes', correct: true },
          { text: 'The compiler will automatically stop it after 100 iterations', correct: false },
          { text: 'The program will skip the loop entirely', correct: false },
          { text: 'The condition will automatically become false eventually', correct: false }
        ]
      },
      {
        text: 'Which loop structure is most suitable when you know exactly how many times you want to iterate?',
        concept: 'loops',
        difficulty: 'easy',
        mark: 10,
        answers: [
          { text: 'for loop', correct: true },
          { text: 'while loop', correct: false },
          { text: 'do-while loop', correct: false },
          { text: 'switch loop', correct: false }
        ]
      },

      // Switch/Case
      {
        text: 'What is the purpose of the "break" statement inside a switch-case block?',
        concept: 'switch',
        difficulty: 'easy',
        mark: 10,
        answers: [
          { text: 'To exit the switch block immediately and prevent fall-through to the next case', correct: true },
          { text: 'To restart the switch block from the first case', correct: false },
          { text: 'To end the entire program execution', correct: false },
          { text: 'To skip the next case but continue evaluating the remaining cases', correct: false }
        ]
      },
      {
        text: 'What happens in a switch statement if a matching case is found but there is no break statement?',
        concept: 'switch',
        difficulty: 'medium',
        mark: 15,
        answers: [
          { text: 'Execution falls through to the next cases until a break is encountered or the switch ends', correct: true },
          { text: 'The switch statement throws a syntax error', correct: false },
          { text: 'It automatically exits after executing the matching case', correct: false },
          { text: 'It goes back to the beginning of the switch block', correct: false }
        ]
      },
      {
        text: 'Which keyword is used in a switch statement to define the code block that runs if no cases match?',
        concept: 'switch',
        difficulty: 'easy',
        mark: 10,
        answers: [
          { text: 'default', correct: true },
          { text: 'else', correct: false },
          { text: 'catch', correct: false },
          { text: 'finally', correct: false }
        ]
      },

      // Exceptions
      {
        text: 'How do you conventionally handle unexpected runtime errors to prevent a program from crashing?',
        concept: 'exceptions',
        difficulty: 'medium',
        mark: 15,
        answers: [
          { text: 'By wrapping the risky code in a try-catch block', correct: true },
          { text: 'By using multiple nested if-else blocks', correct: false },
          { text: 'By ignoring the error and using a continue statement', correct: false },
          { text: 'By writing perfect code that never produces errors', correct: false }
        ]
      },
      {
        text: 'What is the purpose of the "finally" block in exception handling?',
        concept: 'exceptions',
        difficulty: 'hard',
        mark: 20,
        answers: [
          { text: 'To execute cleanup code regardless of whether an exception was thrown or caught', correct: true },
          { text: 'To catch the final error that crashed the program', correct: false },
          { text: 'To end the program successfully', correct: false },
          { text: 'To retry the try block one last time', correct: false }
        ]
      },
      {
        text: 'Which keyword is typically used to manually trigger or generate a custom exception?',
        concept: 'exceptions',
        difficulty: 'hard',
        mark: 20,
        answers: [
          { text: 'throw', correct: true },
          { text: 'catch', correct: false },
          { text: 'return', correct: false },
          { text: 'break', correct: false }
        ]
      }
    ];

    for (const q of questions) {
      const [res] = await connection.query(
        'INSERT INTO Question (questiontext, concept, difficulty, mark) VALUES (?, ?, ?, ?)',
        [q.text, q.concept, q.difficulty, q.mark]
      );
      const qId = res.insertId;
      for (const a of q.answers) {
        await connection.query(
          'INSERT INTO Answer (questionid, answertext, iscorrect) VALUES (?, ?, ?)',
          [qId, a.text, a.correct ? 1 : 0]
        );
      }
    }

    console.log('Inserted 15 comprehensive Control Flow questions!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
