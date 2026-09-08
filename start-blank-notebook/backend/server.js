const express = require("express");
require('dotenv').config(); //import to be able to hide password in a file that isn't in git
// console.log(typeof process.env.DB_PASSWORD);

const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcrypt"); //hashes passwords
const session = require("express-session"); //remembers whos signed in for more than 1 question

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use(
    session({
        secret: "change-later",
        resave: false,
        saveUninitialized: false,
    })
);

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "notes_app",
    password: process.env.DB_PASSWORD,
    port: 5432,
});

app.get("/api/notes", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notes ORDER BY created_at DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error getting notes" });
    }
});

// post a note
app.post("/api/notes", async (req, res) => {
    try {
        const { content } = req.body;

        const result = await pool.query(
            "INSERT INTO notes (content) VALUES ($1) RETURNING *",
            [content]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error posting note" });
    }
});

app.post("/api/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username or password are empty",
      });
    }

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "Username already exists :(",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username`,
      [username, passwordHash]
    );

    res.status(201).json({
      message: "Account created :D",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Database error creating account",
    });
  }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});