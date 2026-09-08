const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");

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
        res.status(500).json({ error: "Database error" });
    }
});

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
        res.status(500).json({ error: "Database error" });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});