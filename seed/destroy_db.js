const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("../christmas_lists.db");

db.serialize(() => {
  // Drop tables one by one
  db.run(`DROP TABLE IF EXISTS lists`);
  db.run(`DROP TABLE IF EXISTS users`);
  db.run(`DROP TABLE IF EXISTS gifts`);
  db.run(`DROP TABLE IF EXISTS notes`);

  // Close the database connection after dropping tables
  db.close((err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("Tables dropped and database closed successfully.");
    }
  });
});
