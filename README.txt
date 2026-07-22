# CodeRealm: Python Classes and Objects

CodeRealm is an educational hybrid board game for practising the Python **Classes and Objects** concept. Players use a physical board and QR cards with the web application to answer questions in real time.

## Requirements

- Node.js
- XAMPP MySQL (started)
- A browser on the same network for multiplayer play

## Setup

1. Create a `.env` file using your local XAMPP MySQL details:

   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=coderealm
   SESSION_SECRET=change_this_to_a_private_value
   PORT=3000

2. Install packages and create the database:

   npm install
   node database/setup.js

3. Start the web app:

   npm start

4. Open `http://localhost:3000`.

## Test accounts

| Username | Password | Role |
| --- | --- | --- |
| admin | admin123 | Administrator |
| player1 | player1 | Player |
| player2 | player2 | Player |

## Reset question bank

To replace all stored questions with the 15 Python Classes and Objects questions:

node update_questions.js

## zrok multiplayer sharing

When XAMPP and the Node server are running, create a public URL for phone testing:

zrok share public localhost:3000

Open the resulting URL on each device, then use the host's room QR code to join the game.
