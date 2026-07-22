// All formative-assessment questions focus on one Python concept only:
// Classes and Objects.
module.exports = [
  {
    text: 'Which keyword is used to define a class in Python?', difficulty: 'easy', mark: 10,
    answers: [
      { text: 'class', correct: true }, { text: 'object', correct: false },
      { text: 'define', correct: false }, { text: 'new', correct: false }
    ]
  },
  {
    text: 'What is an object in Python?', difficulty: 'easy', mark: 10,
    answers: [
      { text: 'An instance created from a class', correct: true }, { text: 'A Python keyword for loops', correct: false },
      { text: 'A type of database table', correct: false }, { text: 'A function that cannot store data', correct: false }
    ]
  },
  {
    text: 'In a class method, what does the self parameter refer to?', difficulty: 'easy', mark: 10,
    answers: [
      { text: 'The current instance of the class', correct: true }, { text: 'The parent class only', correct: false },
      { text: 'Every object in the program', correct: false }, { text: 'The Python interpreter', correct: false }
    ]
  },
  {
    text: 'Which special method usually runs automatically when a new object is created?', difficulty: 'easy', mark: 10,
    answers: [
      { text: '__init__', correct: true }, { text: '__start__', correct: false },
      { text: '__create__', correct: false }, { text: '__main__', correct: false }
    ]
  },
  {
    text: 'Given class Player: pass, which statement creates an object named hero?', difficulty: 'easy', mark: 10,
    answers: [
      { text: 'hero = Player()', correct: true }, { text: 'Player = hero()', correct: false },
      { text: 'hero = new Player', correct: false }, { text: 'object hero = Player', correct: false }
    ]
  },
  {
    text: 'What is an instance attribute?', difficulty: 'medium', mark: 15,
    answers: [
      { text: 'Data stored separately for each object, such as self.name', correct: true }, { text: 'A variable that can only be used outside a class', correct: false },
      { text: 'A method shared by all modules', correct: false }, { text: 'A Python built-in constant', correct: false }
    ]
  },
  {
    text: 'What will hero.name return after hero.name = "Ava"?', difficulty: 'medium', mark: 15,
    answers: [
      { text: 'The value "Ava" stored in hero\'s name attribute', correct: true }, { text: 'The class definition', correct: false },
      { text: 'A syntax error', correct: false }, { text: 'The name of every Player object', correct: false }
    ]
  },
  {
    text: 'Why is self used in self.score = score inside __init__?', difficulty: 'medium', mark: 15,
    answers: [
      { text: 'It saves score as an attribute of that particular object', correct: true }, { text: 'It makes score a global variable', correct: false },
      { text: 'It deletes the score parameter', correct: false }, { text: 'It creates a new class', correct: false }
    ]
  },
  {
    text: 'Which is the correct way to call an object method named attack?', difficulty: 'medium', mark: 15,
    answers: [
      { text: 'hero.attack()', correct: true }, { text: 'attack.hero()', correct: false },
      { text: 'hero->attack()', correct: false }, { text: 'attack(hero.self)', correct: false }
    ]
  },
  {
    text: 'What is a class attribute?', difficulty: 'medium', mark: 15,
    answers: [
      { text: 'An attribute defined in the class body and shared by its instances', correct: true }, { text: 'An attribute that must start with self', correct: false },
      { text: 'An attribute visible only inside __init__', correct: false }, { text: 'A variable that cannot be read', correct: false }
    ]
  },
  {
    text: 'If Player.count = 0 is defined in the class body, where should it be accessed?', difficulty: 'medium', mark: 15,
    answers: [
      { text: 'Player.count', correct: true }, { text: 'count.Player', correct: false },
      { text: 'self.Player.count outside a method', correct: false }, { text: 'object.count() only', correct: false }
    ]
  },
  {
    text: 'Which method definition correctly accepts an instance and a message?', difficulty: 'hard', mark: 20,
    answers: [
      { text: 'def speak(self, message):', correct: true }, { text: 'def speak(message):', correct: false },
      { text: 'function speak(self, message):', correct: false }, { text: 'def self.speak(message):', correct: false }
    ]
  },
  {
    text: 'What does the following code print? class Dice: sides = 6; d = Dice(); print(d.sides)', difficulty: 'hard', mark: 20,
    answers: [
      { text: '6', correct: true }, { text: 'sides', correct: false },
      { text: 'None', correct: false }, { text: 'An error because d has no sides attribute', correct: false }
    ]
  },
  {
    text: 'Why are classes useful in a game program?', difficulty: 'hard', mark: 20,
    answers: [
      { text: 'They group related data and behaviours for entities such as players or monsters', correct: true }, { text: 'They prevent all runtime errors', correct: false },
      { text: 'They replace the need for variables', correct: false }, { text: 'They can only be used for graphics', correct: false }
    ]
  },
  {
    text: 'What is the relationship between the Player class and hero = Player()?', difficulty: 'hard', mark: 20,
    answers: [
      { text: 'Player is the blueprint and hero is an instance made from it', correct: true }, { text: 'hero is the blueprint and Player is a method', correct: false },
      { text: 'They are unrelated variables', correct: false }, { text: 'Both are class attributes', correct: false }
    ]
  }
].map(question => ({ ...question, concept: 'classes_objects' }));
