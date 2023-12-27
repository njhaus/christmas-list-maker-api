const express = require("express");
const dotenv = require("dotenv");
dotenv.config({ silent: process.env.NODE_ENV === "production" });

const app = express();
const port = process.env.PORT;

// Id
const { v4: uuidv4 } = require("uuid");

// bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 10;

// Database
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("christmas_lists.db");

// cors middleware for allowing react to fetch() from server
var cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD", "PATCH"],
    credentials: true,
    preflightContinue: false,
  })
);

// parse application/x-www-form-urlencoded
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
const session = require("express-session");
const cookieParser = require("cookie-parser");
app.use(cookieParser());

const sessionConfig = {
  name: "mr-session",
  secret: process.env.SESSION_SECRET,
  // store: store,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: "None",
  },
};
app.use(session(sessionConfig));

// Body parser -- parse application/json
app.use(bodyParser.json());

// ++++++++++++++ROUTES+++++++++++++++++++++
// __________________________________________________________________________________________________________________________________________

// CREATE list
app.post("/home/new", async (req, res) => {
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
          throw new Error();
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
});


// __________________________________________________________________________________________________________________________________________


// OPEN list

app.post("/home/open", async (req, res) => {
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
});

// __________________________________________________________________________________________________________________________________________

// FIND list
app.post("/list/find", async (req, res) => {
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
    const usersSql =
      "SELECT name, recipients FROM users WHERE _list_id = ?";
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
});

// __________________________________________________________________________________________________________________________________________


// CREATE (or edit) LIST
app.post("/list/create", async (req, res) => {
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
});



// __________________________________________________________________________________________________________________________________________

// CREATE recipients for list
app.post("/list/recipients", async (req, res) => {
  console.log("list/recipients");
  const { _id: listId, title, users  } = req.body;
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
      const recipientString = user.recipients.join(', ');
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
      message: "success"
    });
  } catch (err) {
    console.log(err);
    return res.send({ error: "There was an error accessing your list." });
  }
});


// __________________________________________________________________________________________________________________________________________

//CREATE USER ACCESS CODE
app.post("/user/create", async (req, res) => {
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
});

// __________________________________________________________________________________________________________________________________________

//ACCESS EXISTING USER ACCESS CODE
app.post("/user/access", async (req, res) => {
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
      return res.send({ error: "Unable to verify credentials." });
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
});

// __________________________________________________________________________________________________________________________________________

// FIND/CHECK LOGGED IN USER
app.post("/user/find", async (req, res) => {
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
});

// __________________________________________________________________________________________________________________________________________


// Get user's list -- return edit user OR view user (From UserRouter component)
app.post("/user/data", async (req, res) => {
  console.log("user/data");
  // Tokens find current User
  const listToken = req.cookies?.list;
  const userToken = req.cookies?.user;
  // Body finds user being viewed
  const { listId, username } = req.body;

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
        [username, listId],
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
});



// __________________________________________________________________________________________________________________________________________

// Make new user gift

app.post('/user/gift/new', async (req, res) => {
  
  const userToken = req.cookies?.user;
  const { newGift, newLink, listId } = req.body;
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
        [newGiftId, newGift, newLink, viewUserId],
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
        description: newGift,
        link: newLink,
      }
    });

  } catch (err) {
    return res.send({error: "There was an error saving your gift"})
  }

})



// __________________________________________________________________________________________________________________________________________

// Edit a user gift

app.post('/user/gift/edit', async (req, res) => {
  
  const userToken = req.cookies?.user;
  const { giftId, description, link, listId } = req.body;
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
        [description, link, giftId, viewUserId],
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
        description: description,
        link: link,
      }
    });

  } catch (err) {
    return res.send({error: "There was an error saving your gift"})
  }
})


// __________________________________________________________________________________________________________________________________________

// Delete a user gift

app.post('/user/gift/delete', async (req, res) => {
  
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
        id: giftId
      }
    });

  } catch (err) {
    return res.send({error: "There was an error saving your gift"})
  }

})


// __________________________________________________________________________________________________________________________________________

// Buy a user gift

app.post('/user/gift/buy', async (req, res) => {
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
    const viewUserName = bought === true ? viewUser[0].name : '';

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
        name: viewUserName
      }
    });

  } catch (err) {
    return res.send({error: "There was an error saving your gift"})
  }
})




// __________________________________________________________________________________________________________________________________________

// Make new note

app.post('/user/note/create', async (req, res) => {
  
  const userToken = req.cookies?.user;
  const { description, listId, username } = req.body;
  // Get the person who note is being wriiten for with user id with name and list id
  try {
    const viewUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE name = ? AND _list_id = ?",
        [username, listId],
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
        [newNoteId, description, writingUserName, viewUserId],
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
        description: description,
        written_by: writingUserName
      }
    });

  } catch (err) {
    return res.send({error: "There was an error saving your note"})
  }

})



// __________________________________________________________________________________________________________________________________________

// Delete note

app.post('/user/note/delete', async (req, res) => {
  
  const userToken = req.cookies?.user;
  const { listId, username, noteId, currentUser } = req.body;
  // Get the person who note is being wriiten for with name and list id
  try {
    const viewUser = await new Promise((resolve, reject) =>
      db.all(
        "SELECT id, name FROM users WHERE name = ? AND _list_id = ?",
        [username, listId],
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
        id: noteId
      }
    });

  } catch (err) {
    return res.send({error: "There was an error saving your note"})
  }

})



// __________________________________________________________________________________________________________________________________________


// LOGOUT
app.post("/logout", async (req, res) => {
  res.clearCookie("list", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    // maxAge: 12 * 60 * 60 * 1000,
  });
  res.clearCookie("user", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    // maxAge: 12 * 60 * 60 * 1000,
  });
  res.send({ message: "success" });
});

// TEST ROUTE
app.get("/", (req, res) => {
  res.send('"message": "database connection working. / route accessed."' )
});

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Closed the database connection.");
    process.exit(0);
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
