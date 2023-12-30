// Id
const { v4: uuidv4 } = require("uuid");

// bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 10;

// Database
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("christmas_lists.db");

// ROUTE FUNCTIONS

// ------------------FIND GROUP INFO ----------------------

const findList = async (req, res) => {
  console.log("list/find");
  const { listId } = req.body;
  const token = req.cookies?.list;

  if (!token) {
    return res.send({ error: "You are not logged in" });
  }

  try {
    //  GET LIST TITLE/ID
    const getList = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, title FROM lists WHERE id = ? AND list_token = ?",
        [listId, token],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );

    if (getList.length < 1) {
      console.log("no list found");
      return res.send({ error: "Unable to verify credentials." });
    }

    const list = getList[0];

    // GET USERS ASSOCIATED WITH LIST
    const usersSql = "SELECT name, recipients FROM users WHERE _list_id = ?";
    const getUsers = await new Promise((resolve, reject) =>
      db.all(usersSql, [list.id], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      })
    );

    return res.send({
      message: "success",
      data: {
        _id: list.id,
        title: list.title,
        users: getUsers,
      },
    });
  } catch (err) {
    console.log(err);
    return res.send({ error: "There was an error accessing your list." });
  }
};


// ------------------CREATE LIST ----------------------

const createList = async (req, res) => {
  console.log("list/create");
  const { _id, title, users } = req.body;
  const token = req.cookies?.list;
  try {
    // Check token
    const getList = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, title FROM lists WHERE title = ? AND list_token = ?",
        [title, token],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows[0]);
          }
        }
      )
    );
    // Delete any old users in list (bombs the whole list)
    const deleteOldList = await new Promise((resolve, reject) =>
      db.all(
        "DELETE FROM users WHERE _list_id = ?",
        [getList.id],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows[0]);
          }
        }
      )
    );

    // Insert users and give them the _list_id
    for (let user of users) {
      const userId = uuidv4();
      const username = user.name.toLowerCase();
      const listId = getList.id;
      const getUsers = await new Promise((resolve, reject) =>
        db.all(
          "INSERT INTO users (id, name, _list_id) VALUES (?, ?, ?)",
          [userId, username, listId],
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          }
        )
      );
    }
    res.send({ message: "success" });
  } catch (err) {
    res.send({ error: "There was an error updating users" });
  }
};


const setRecipients = async (req, res) => {
  console.log("list/recipients");
  const { _id: listId, title, users } = req.body;
  const token = req.cookies?.list;

  if (!token) {
    return res.send({ error: "You are not logged in" });
  }

  try {
    //  GET LIST TITLE/ID
    const getList = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, title FROM lists WHERE id = ? AND list_token = ?",
        [listId, token],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );

    if (getList.length < 1) {
      console.log("no list found");
      return res.send({ error: "Unable to verify credentials." });
    }

    const list = getList[0];

    // UPDATE USERS ASSOCIATED WITH LIST
    for (let user of users) {
      const recipientString = user.recipients.join(", ");
      const username = user.name;
      const usersSql =
        "UPDATE users SET recipients = ? WHERE name = ? AND _list_id = ?";
      const updateUser = await new Promise((resolve, reject) =>
        db.all(usersSql, [recipientString, username, listId], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        })
      );
    }

    return res.send({
      message: "success",
    });
  } catch (err) {
    console.log(err);
    return res.send({ error: "There was an error accessing your list." });
  }
};

module.exports = {
    findList,
    createList,
    setRecipients
}
