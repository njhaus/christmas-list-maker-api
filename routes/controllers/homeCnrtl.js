// Id
const { v4: uuidv4 } = require("uuid");

// bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 10;

// Database
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("christmas_lists.db");

// ROUTE FUNCTIONS

// ------------------MAKE NEW GROUP ----------------------

const newGroup = async (req, res) => {
  const newListId = uuidv4();
  const { title, code } = req.body;
  try {
    // Check that no lists with this name already exist
    const checkList = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, title FROM lists WHERE title = ?",
        [title],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (checkList[0]) {
      return res.send({ error: "A list with this name already exists." });
    }
    // Hash code
    const hashedCode = await new Promise((resolve, reject) =>
      bcrypt.hash(code, saltRounds, function (err, hash) {
        if (err) {
          reject(err);
        }
        // Store hash in your password DB.
        else {
          resolve(hash);
        }
      })
    );

    const listToken = uuidv4();
    const newList = await db.run(
      "INSERT INTO lists (id, title, access_code, list_token) VALUES (?, ?, ?, ?)",
      [newListId, title, hashedCode, listToken],
      (err, rows) => {
        if (err) {
          return res.send({ error: "There was an error creating your list." });
        } else {
          res.cookie("list", listToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 12 * 60 * 60 * 1000,
          });
          res.send({
            message: "success",
            listId: newListId,
          });
        }
      }
    );
  } catch (err) {
    console.log(err);
    res.send({ error: "There was an error creating your list." });
  }
};


// ------------------OPEN A GROUP ----------------------

const openGroup = async (req, res) => {
  console.log("/home/open");
  const { title, code } = req.body;
  try {
    // Update token
    const listToken = uuidv4();
    const insertToken = await new Promise((resolve, reject) => {
      db.run(
        "UPDATE lists SET list_token = ? WHERE title = ?",
        [listToken, title],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });

    // Open list
    const sql =
      "SELECT id, title, access_code, list_token FROM lists WHERE title = ?";
    const getList = await new Promise((resolve, reject) =>
      db.all(sql, [title], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      })
    );

    if (getList.length < 1) {
      console.log("no list found");
      return res.send({ error: "incorrect username or password." });
    }

    const list = getList[0];

    bcrypt.compare(code, list.access_code).then(function (result) {
      if (result == true) {
        res.cookie("list", listToken, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 12 * 60 * 60 * 1000,
        });
        return res.send({
          message: "success",
          listId: list.id,
        });
      } else {
        console.log("password no match");
        return res.send({ error: "incorrect username or password." });
      }
    });
  } catch (err) {
    console.log(err);
    return res.send({ error: "There was an error accessing your list." });
  }
};


module.exports = {
    newGroup,
    openGroup
}