const express = require("express");
const dotenv = require("dotenv");
dotenv.config({ silent: process.env.NODE_ENV === "production" });

const app = express();
const port = process.env.PORT;

// const origin = "http://localhost:5173";
const origin =
  "https://christmas-list-maker-production.up.railway.app/";
// cors middleware for allowing react to fetch() from server
var cors = require("cors");
app.use(
  cors({
    origin: origin,
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD", "PATCH"],
    credentials: true,
    preflightContinue: false,
  })
);

// Router
const router = express.Router();

// // Id
const { v4: uuidv4 } = require("uuid");

// // bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 10;

// // Database
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("christmas_lists.db");


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

// Validation functions
const validation = require('./middleware/joi_validation.js')

// ++++++++++++++ROUTES+++++++++++++++++++++

const homeRoute = require('./routes/home.js');
const listRoute = require("./routes/list.js");
const userRoute = require('./routes/user.js');

app.use('/home', homeRoute);
app.use('/list', listRoute);
app.use("/user", userRoute);


// LOGOUT
app.post("/logout", validation.validateInputs, async (req, res) => {
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


// CLOSE DATABASE
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
