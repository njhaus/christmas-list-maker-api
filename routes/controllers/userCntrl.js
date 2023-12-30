// Id
const { v4: uuidv4 } = require("uuid");

// bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 10;

// Database
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("christmas_lists.db");

// ROUTE FUNCTIONS

// ------------------CREATE USER ----------------------

const createUser = async (req, res) => {
  const { listId, name, code } = req.body;
  const token = uuidv4();
  try {
    const hashedCode = await new Promise((resolve, reject) =>
      bcrypt.hash(code, saltRounds, function (err, hash) {
        if (err) {
          reject(err);
        } else {
          resolve(hash);
        }
      })
    );
    // Create code
    const createCode = await new Promise((resolve, reject) =>
      db.run(
        "UPDATE users SET access_code = ?, user_token = ? WHERE _list_id = ? AND name = ?",
        [hashedCode, token, listId, name],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
      )
    );
    // Return user and log in session
    const usersSql =
      "SELECT name, id, user_token FROM users WHERE _list_id = ? AND name = ?";

    const getUser = await new Promise((resolve, reject) =>
      db.all(usersSql, [listId, name], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows[0]);
        }
      })
    );

    if (!getUser) {
      return res.send({
        error:
          "Name not found on this list. Make sure the name you type matches your name on this list! (Not case sensitive.)",
      });
    }

    res.cookie("user", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.send({
      message: "success",
      data: {
        name: getUser.name,
        id: getUser.id,
      },
    });
  } catch (err) {
    console.log(err);
    res.send({ error: "There was an error creating your access code." });
  }
};


// ------------------ACCESS USER ----------------------

const accessUser = async (req, res) => {
  const { listId, name, code } = req.body;
  const token = uuidv4();
  try {
    // Update token
    const listToken = uuidv4();
    const insertToken = await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET user_token = ? WHERE name = ? AND _list_id = ?",
        [token, name, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
    //  GET USER
    const getUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT name, id, access_code FROM users WHERE name = ? AND _list_id = ?",
        [name, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );

    if (getUser.length < 1) {
      console.log("no user found");
      return res.send({
        error:
          "Name not found on this list. Make sure the name you type matches your name on this list! (Not case sensitive.)",
      });
    } else if (
      getUser[0].access_code == "null" ||
      getUser[0].access_code == null ||
      !getUser[0].access_code
    ) {
      console.log("no access code");
      return res.send({ error: "You haven't created an access code yet." });
    }

    const currUser = getUser[0];
    //  COMPARE ACCESS CODE
    const checkPassword = await new Promise((resolve, reject) =>
      bcrypt.compare(code, currUser.access_code).then(function (result) {
        if (result == true) {
          resolve(true);
        } else {
          console.log("password no match");
          reject(false);
        }
      })
    );

    res.cookie("user", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.send({
      message: "success",
      data: {
        name: currUser.name,
        id: currUser.id,
      },
    });
  } catch (err) {
    console.log(err);
    res.send({ error: "There was an error logging in." });
  }
};


// ------------------FIND USER ----------------------

const findUser = async (req, res) => {
  console.log("user/find");
  const token = req.cookies?.user;
  if (!token) {
    return res.send({ message: "No token." });
  }
  try {
    //  GET USER
    const getUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE user_token = ?",
        [token],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );

    if (getUser.length < 1) {
      console.log("no list found");
      return res.send({ error: "Unable to verify credentials." });
    }

    const user = getUser[0];
    return res.send({
      message: "success",
      data: {
        name: user.name,
        id: user.id,
      },
    });
  } catch (err) {
    return res.send({ error: "There was an error processing your request" });
  }
};


// ------------------GET USER DATA----------------------

const getUserData = async (req, res) => {
  console.log("user/data");
  // Tokens find current User
  const listToken = req.cookies?.list;
  const userToken = req.cookies?.user;
  // Body finds user being viewed
  const { listId, name } = req.body;

  if (!listToken || !userToken) {
    return res.send({ error: "Please log in to view this page." });
  }
  // Body finds user whose gifts are bing viewed. If they match, return editUser data (list of gifts, not returning if bought), otherwise, return viewUser data (list of gifts and notes)
  try {
    //  GET current USER
    const currentUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE user_token = ? AND _list_id = ?",
        [userToken, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (currentUser.length < 1)
      return res.send({ error: "Error finding Current User." });
    const currentUserId = currentUser[0].id;
    const currentUserName = currentUser[0].name;

    // Get user being viewed
    const viewUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE name = ? AND _list_id = ?",
        [name, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (viewUser.length < 1)
      return res.send({ error: "Error finding Viewed User." });
    const viewUserId = viewUser[0].id;
    const viewUserName = viewUser[0].name;

    // Get user gifts
    const userGifts = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, description, link, bought, buyer_name FROM gifts WHERE _user_id = ?",
        [viewUserId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );

    // Get user notes
    const userNotes = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, description, written_by FROM notes WHERE _user_id = ?",
        [viewUserId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );

    // Users Match? send current user data (only name and link from gifts list)
    if (viewUserId === currentUserId) {
      const editGifts = userGifts.map((gift) => ({
        id: gift.id,
        description: gift.description,
        link: gift.link,
      }));
      return res.send({
        message: "success",
        data: {
          editUser: {
            name: currentUserName,
            gifts: editGifts,
          },
          currentUser: currentUserName,
        },
      });
    }

    // Users don't match? Send all gift and notes data
    else {
      return res.send({
        message: "success",
        data: {
          viewUser: {
            name: viewUserName,
            gifts: userGifts,
            notes: userNotes,
          },
          currentUser: currentUserName,
        },
      });
    }
  } catch (err) {
    return res.send({ error: "There was an error processing your request" });
  }
};


// ------------------NEW GIFT----------------------

const newGift = async (req, res) => {
  const userToken = req.cookies?.user;
  const { giftDescription, link, listId } = req.body;
  // Get user id with token and list id
  try {
    const viewUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE user_token = ? AND _list_id = ?",
        [userToken, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (viewUser.length < 1)
      return res.send({ error: "Error finding Viewed User." });
    const viewUserId = viewUser[0].id;

    // Save gift
    const newGiftId = uuidv4();
    const newGiftSaved = await new Promise((resolve, reject) =>
      db.all(
        "INSERT INTO gifts (id, description, link, _user_id) VALUES (?, ?, ?, ?)",
        [newGiftId, giftDescription, link, viewUserId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    return res.send({
      message: "success",
      newGift: {
        id: newGiftId,
        description: giftDescription,
        link: link,
      },
    });
  } catch (err) {
    return res.send({ error: "There was an error saving your gift" });
  }
};


// ------------------EDIT GIFT----------------------

const editGift = async (req, res) => {
  const userToken = req.cookies?.user;
  const { giftId, giftDescription, link, listId } = req.body;
  // Get user id with token and list id
  try {
    const viewUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE user_token = ? AND _list_id = ?",
        [userToken, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (viewUser.length < 1)
      return res.send({ error: "Error finding Viewed User." });
    const viewUserId = viewUser[0].id;

    // Edit gift
    const editedGift = await new Promise((resolve, reject) =>
      db.all(
        "UPDATE gifts SET description = ?, link = ? WHERE id = ? AND _user_id = ?",
        [giftDescription, link, giftId, viewUserId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    return res.send({
      message: "success",
      editedGift: {
        id: giftId,
        description: giftDescription,
        link: link,
      },
    });
  } catch (err) {
    return res.send({ error: "There was an error saving your gift" });
  }
};


// ------------------DELETE GIFT----------------------

const deleteGift = async (req, res) => {
  const userToken = req.cookies?.user;
  const { giftId, listId } = req.body;
  // Get user id with token and list id
  try {
    const viewUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE user_token = ? AND _list_id = ?",
        [userToken, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (viewUser.length < 1)
      return res.send({ error: "Error finding Viewed User." });
    const viewUserId = viewUser[0].id;

    // Delete gift
    const deletedGift = await new Promise((resolve, reject) =>
      db.all(
        "DELETE FROM gifts WHERE id = ? AND _user_id = ?",
        [giftId, viewUserId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    return res.send({
      message: "success",
      deletedGift: {
        id: giftId,
      },
    });
  } catch (err) {
    return res.send({ error: "There was an error saving your gift" });
  }
};


// ------------------BUY GIFT----------------------

const buyGift = async (req, res) => {
  console.log("/user/gift/buy");
  const userToken = req.cookies?.user;
  const { giftId, bought, listId } = req.body;
  // Get user id with token and list id
  try {
    const viewUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE user_token = ? AND _list_id = ?",
        [userToken, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (viewUser.length < 1)
      return res.send({ error: "Error finding Viewed User." });
    const viewUserName = bought === true ? viewUser[0].name : "";

    // Edit gift
    const editedGift = await new Promise((resolve, reject) =>
      db.all(
        "UPDATE gifts SET bought = ?, buyer_name = ? WHERE id = ?",
        [bought, viewUserName, giftId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    return res.send({
      message: "success",
      boughtGift: {
        id: giftId,
        bought: bought,
        name: viewUserName,
      },
    });
  } catch (err) {
    return res.send({ error: "There was an error saving your gift" });
  }
};


// ------------------CREATE NOTE----------------------

const createNote = async (req, res) => {
  const userToken = req.cookies?.user;
  const { noteDescription, listId, name } = req.body;
  // Get the person who note is being wriiten for with user id with name and list id
  try {
    const viewUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE name = ? AND _list_id = ?",
        [name, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (viewUser.length < 1)
      return res.send({ error: "Error finding Viewed User." });
    const viewUserId = viewUser[0].id;

    // Get the user who is WRITING the note with usertoken and listId
    const writingUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE user_token = ? AND _list_id = ?",
        [userToken, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (writingUser.length < 1)
      return res.send({ error: "Error finding writing User." });
    const writingUserName = writingUser[0].name;

    // Save note
    const newNoteId = uuidv4();
    const newNoteSaved = await new Promise((resolve, reject) =>
      db.all(
        "INSERT INTO notes (id, description, written_by, _user_id) VALUES (?, ?, ?, ?)",
        [newNoteId, noteDescription, writingUserName, viewUserId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );

    return res.send({
      message: "success",
      newNote: {
        id: newNoteId,
        description: noteDescription,
        written_by: writingUserName,
      },
    });
  } catch (err) {
    return res.send({ error: "There was an error saving your note" });
  }
};


// ------------------DELETE NOTE----------------------

const deleteNote = async (req, res) => {
  const userToken = req.cookies?.user;
  const { listId, name, noteId } = req.body;
  // Get the person who note is being wriiten for with name and list id
  try {
    const viewUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE name = ? AND _list_id = ?",
        [name, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (viewUser.length < 1)
      return res.send({ error: "Error finding Viewed User." });
    const viewUserId = viewUser[0].id;

    // Get the user who WROTE the note (and is deleting) with usertoken and listId
    const writingUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE user_token = ? AND _list_id = ?",
        [userToken, listId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );
    if (writingUser.length < 1)
      return res.send({ error: "Error finding writing User." });
    const writingUserName = writingUser[0].name;

    // Delete note
    const newNoteDeleted = await new Promise((resolve, reject) =>
      db.all(
        "DELETE FROM notes WHERE id = ? AND written_by = ? AND _user_id = ?",
        [noteId, writingUserName, viewUserId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      )
    );

    return res.send({
      message: "success",
      deletedNote: {
        id: noteId,
      },
    });
  } catch (err) {
    return res.send({ error: "There was an error saving your note" });
  }
};

module.exports = {
    createUser,
    accessUser,
    findUser,
    getUserData,
    newGift,
    editGift,
    deleteGift,
    buyGift,
    createNote,
    deleteNote
};
