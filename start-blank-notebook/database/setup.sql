CREATE DATABASE notes_app;

\c notes_app

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    user_id INTEGER REFERENCES users(id)
);

-- to run cd into database in terminal thing run
-- psql -U postgres -f setup.sql
-- to run psql in gen
-- psql -U postgres
-- \dt to view list of tables
-- \d [table name] to view table
-- \conninfo to see if connected to database
-- \c [database] to connect to database