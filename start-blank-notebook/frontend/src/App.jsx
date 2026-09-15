import { useEffect, useState } from "react";

function App() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [showPrev, setShowPrev] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // load notes from the browser cache of localStorage
  useEffect(() => {
    const cachedNotes = JSON.parse(localStorage.getItem("notes")) || [];
    setNotes(cachedNotes);
  }, []);

  // Save a new note to localStorage
  const saveNote = () => {
    if (content.trim() === "") {
      return;
    }
    const newNote = {
      id: Date.now(),
      content: content,
      savedToPostgres: false,
    };

    const updatedNotes = [newNote, ...notes];

    localStorage.setItem("notes", JSON.stringify(updatedNotes));

    setNotes(updatedNotes);
    setContent("");


  };

  const saveToPostgres = async () => {
    const cachedNotes = JSON.parse(localStorage.getItem("notes")) || [];

    try {
      // 1. Save current textbox directly to psql
      if (content.trim() !== "") {
        const response = await fetch("http://localhost:3000/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            content: content,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save current note");
        }

        setContent("");
      }

      // 2. Save unsent localStorage notes to psql
      for (const note of cachedNotes) {
        if (!note.savedToPostgres) {

          const response = await fetch("http://localhost:3000/api/notes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              content: note.content,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            console.error("Save failed:", data);
            return;
          }

          note.savedToPostgres = true;
        }
      }
      // store updated notes to localstorage
      localStorage.setItem("notes", JSON.stringify(cachedNotes));
      // render the updated notes
      setNotes(cachedNotes);
      setMessage("Unsaved notes saved to PostgreSQL");
      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error saving notes to PostgreSQL:", error);
    }
  };

  const signup = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error);
        return;
      }

      setMessage("Account created!");
    } catch (error) {
      console.error(error);
      setMessage("Error connecting to server for sign up");
    }
  };

  const login = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error);
        return;
      }

      setIsLoggedIn(true);
      setMessage("Logged in!");

      // Load PostgreSQL notes from username
      const notesResponse = await fetch("http://localhost:3000/api/notes", {
        credentials: "include",
      });

      if (notesResponse.ok) {
        const postgresNotes = await notesResponse.json();

        setNotes((currentNotes) => [
          ...postgresNotes,
          ...currentNotes,
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessage("Error connecting to server for log in");
    }
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="..."
        rows="10"
        cols="50"
      />
      <br />

      <button onClick={saveNote}>
        Local Save
      </button>

      <button onClick={saveToPostgres}>
        PSQL Save
      </button>

      <button onClick={() => setShowLogin(!showLogin)}>
        {showLogin ? "Hide Logging In" : "Show Logging In"}
      </button>


      {showLogin && (
        <>
          <h2>Account</h2>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <br />

          <button onClick={signup}>
            Sign Up
          </button>

          <button onClick={login}>
            Log In
          </button>
          <br />
        </>
      )}

      <button onClick={() => setShowPrev(!showPrev)}>
        {showPrev ? "Hide Previous Entries" : "Show Previous Entries"}
      </button>

      {message && <p>{message}</p>}

      {showPrev &&
        notes.map((note) => (
          <div key={note.id}>
            <p>{note.content}</p>
            <hr />
          </div>
        ))}
    </div>
  );
}

export default App;