// Independent Imports
const { v4: uuidv4 } = require("uuid");

// Database
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("../christmas_lists.db");

db.serialize(() => {
  db.run(`CREATE TABLE lists (
      id TEXT PRIMARY KEY UNIQUE,
      title TEXT NOT NULL UNIQUE,
      access_code TEXT NOT NULL,
      list_token TEXT
  )`);

  db.run(`CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji NUMBER DEFAULT 0x1F600,
      recipients TEXT DEFAULT 'Anybody' NOT NULL,
      access_code TEXT,
      user_token TEXT,
      _list_id TEXT NOT NULL,
      FOREIGN KEY (_list_id) REFERENCES lists(id)
  )`);

  db.run(`CREATE TABLE gifts (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      link TEXT,
      bought BOOLEAN DEFAULT false NOT NULL,
      buyer_name TEXT,
      _user_id TEXT NOT NULL,
      FOREIGN KEY (_user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE notes (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      written_by TEXT NOT NULL,
      _user_id TEXT NOT NULL,
      FOREIGN KEY (_user_id) REFERENCES users(id)
  )`);

  const listId = uuidv4();
  db.run("INSERT INTO lists (id, title, access_code) VALUES (?, ?, ?)", [
    listId,
    "Test List",
    "12345",
  ]);

  const userId = uuidv4();
  db.run(
    "INSERT INTO users (id, name, access_code, _list_id) VALUES (?, ?, ?, ?)",
    [userId, "Test User", "67890", listId]
  );

  const giftOneId = uuidv4();
  db.run(
    "INSERT INTO gifts (id, description, link, bought, buyer_name, _user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      giftOneId,
      "Test Gift One",
      "https://www.google.com",
      true,
      "Test Buyer",
      userId,
    ]
  );

  const giftTwoId = uuidv4();
  db.run(
    "INSERT INTO gifts (id, description, link, _user_id) VALUES (?, ?, ?, ?)",
    [giftTwoId, "Test Gift Two", "https://www.yahoo.com", userId]
  );

  const noteId = uuidv4();
  db.run(
    "INSERT INTO notes (id, description, written_by, _user_id) VALUES (?, ?, ?, ?)",
    [noteId, "Test Note Note Note Note Note", "Test Writer", userId]
  );

  db.close();
});
