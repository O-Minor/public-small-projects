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
      migratedToUserId: null,
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
        const localId = Date.now();
        const response = await fetch("http://localhost:3000/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            content: content,
            localId: localId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save current note");
        }

        const savedNote = await response.json();

        setNotes((currentNotes) => [savedNote, ...currentNotes]);

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
              localId: note.id,
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
      // 3. Update localStorage
      localStorage.setItem("notes", JSON.stringify(cachedNotes));
      setMessage("Unsaved notes saved to PostgreSQL");
      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error saving notes to PostgreSQL:", error);
    }
  };

  const migrateLocalNotes = async (userId) => {
    const cachedNotes = JSON.parse(localStorage.getItem("notes")) || [];

    for (const note of cachedNotes) {
      if (note.migratedToUserId === userId) {
        continue;
      }

      const response = await fetch("http://localhost:3000/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          content: note.content,
          localId: note.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Migration failed:", data);
        continue;
      }

      note.migratedToUserId = userId;
    }

    localStorage.setItem("notes", JSON.stringify(cachedNotes));

    return cachedNotes;
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
      setMessage(`Logged in as ${data.user.username}!`);

      await migrateLocalNotes(data.user.id);

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

  const logout = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      setIsLoggedIn(false);
      setUsername("");
      setMessage("Logged out");
    } catch (error) {
      console.error("Error logging out:", error);
      setMessage("Error logging out");
    }
  };

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/me", {
          credentials: "include",
        });

        const data = await response.json();

        if (data.user) {
          setIsLoggedIn(true);
          setUsername(data.user.username);
        } else {
          setIsLoggedIn(false);
          setUsername("");
        }
      } catch (error) {
        console.error("Error checking login:", error);
      }
    };

    checkLogin();
  }, []);

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
        {showLogin ? "Hide Login" : "Show Login"}
      </button>


      {showLogin && (
        <>
          {isLoggedIn ? (
            <>
              <p>Logged in as {username}</p>
              <p><button onClick={logout}>Log Out</button></p>
            </>
          ) : (
            <p>Not logged in</p>
          )}

          {!isLoggedIn && (
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
            </>)
          }
        </>
      )}

      <button onClick={() => setShowPrev(!showPrev)}>
        {showPrev ? "Hide Prev Notes" : "Show Prev Notes"}
      </button>

      {message && <p>{message}</p>}

      {showPrev &&
        notes
          .filter((note) => {
            // Hide old PostgreSQL notes that have no local_id
            if (note.local_id == null && note.migratedToUserId === undefined) {
              return false;
            }

            return true;
          })
          .filter(
            (note, index, allNotes) =>
              note.local_id == null ||
              index ===
              allNotes.findIndex(
                (otherNote) =>
                  otherNote.local_id === note.local_id
              )
          )
          .map((note) => (
            <div
              key={note.local_id ?? note.id}
              style={{
                marginLeft: "20px",
                marginRight: "20px",
                textAlign: "left",
              }}
            >
              <p>{note.content}</p>
              <hr />
            </div>
          ))}
    </div>
  );
}

export default App;