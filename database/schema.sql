-- CodeRealm: The Python Chronicles
-- Database Schema

CREATE DATABASE IF NOT EXISTS coderealm;
USE coderealm;

-- ========================================
-- User Table
-- ========================================
CREATE TABLE IF NOT EXISTS User (
    userid INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    createtime DATETIME DEFAULT CURRENT_TIMESTAMP,
    role ENUM('admin', 'player') DEFAULT 'player'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- GameRoom Table
-- ========================================
CREATE TABLE IF NOT EXISTS GameRoom (
    roomid INT AUTO_INCREMENT PRIMARY KEY,
    roomname VARCHAR(100) NOT NULL,
    roomcode VARCHAR(6) NOT NULL UNIQUE,
    hostid INT NOT NULL,
    status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
    maxplayers INT DEFAULT 4,
    currentround INT DEFAULT 0,
    totalrounds INT DEFAULT 15,
    createtime DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hostid) REFERENCES User(userid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- Character Table
-- ========================================
CREATE TABLE IF NOT EXISTS `Character` (
    characterid INT AUTO_INCREMENT PRIMARY KEY,
    userid INT NOT NULL,
    roomid INT NOT NULL,
    score INT DEFAULT 0,
    healthpoint INT DEFAULT 100,
    class_mastery INT DEFAULT 60,
    constructor_power INT DEFAULT 50,
    inheritance_link INT DEFAULT 40,
    poly_shift INT DEFAULT 30,
    position INT DEFAULT 0,
    isalive TINYINT(1) DEFAULT 1,
    FOREIGN KEY (userid) REFERENCES User(userid) ON DELETE CASCADE,
    FOREIGN KEY (roomid) REFERENCES GameRoom(roomid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- Question Table
-- ========================================
CREATE TABLE IF NOT EXISTS Question (
    questionid INT AUTO_INCREMENT PRIMARY KEY,
    questiontext TEXT NOT NULL,
    concept VARCHAR(50) NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    createtime DATETIME DEFAULT CURRENT_TIMESTAMP,
    mark INT DEFAULT 10
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- Answer Table
-- ========================================
CREATE TABLE IF NOT EXISTS Answer (
    answerid INT AUTO_INCREMENT PRIMARY KEY,
    questionid INT NOT NULL,
    answertext TEXT NOT NULL,
    iscorrect TINYINT(1) DEFAULT 0,
    FOREIGN KEY (questionid) REFERENCES Question(questionid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- GameEvent Table
-- ========================================
CREATE TABLE IF NOT EXISTS GameEvent (
    eventid INT AUTO_INCREMENT PRIMARY KEY,
    eventtype ENUM('monster', 'treasure', 'trap', 'rest', 'boss') NOT NULL,
    description TEXT NOT NULL,
    concept VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- GameEventQuestion Table (links events to questions)
-- ========================================
CREATE TABLE IF NOT EXISTS GameEventQuestion (
    eventquestionid INT AUTO_INCREMENT PRIMARY KEY,
    questionid INT NOT NULL,
    eventid INT NOT NULL,
    FOREIGN KEY (questionid) REFERENCES Question(questionid) ON DELETE CASCADE,
    FOREIGN KEY (eventid) REFERENCES GameEvent(eventid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- PlayerResponse Table
-- ========================================
CREATE TABLE IF NOT EXISTS PlayerResponse (
    responseid INT AUTO_INCREMENT PRIMARY KEY,
    characterid INT NOT NULL,
    questionid INT NOT NULL,
    answerid INT,
    eventid INT,
    iscorrect TINYINT(1) DEFAULT 0,
    diceroll INT DEFAULT 0,
    result ENUM('critical_success', 'extreme_success', 'hard_success', 'success', 'failure', 'fumble') DEFAULT NULL,
    scorechange INT DEFAULT 0,
    hpchange INT DEFAULT 0,
    skillchange INT DEFAULT 0,
    answertime DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (characterid) REFERENCES `Character`(characterid) ON DELETE CASCADE,
    FOREIGN KEY (questionid) REFERENCES Question(questionid) ON DELETE CASCADE,
    FOREIGN KEY (answerid) REFERENCES Answer(answerid) ON DELETE SET NULL,
    FOREIGN KEY (eventid) REFERENCES GameEvent(eventid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
