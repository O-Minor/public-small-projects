import { useEffect, useState } from "react";

function App() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [showPrev, setShowPrev] = useState(false);
  const [message, setMessage] = useState("");

  // load notes from the browser cache of localStorage
  useEffect(() => {
    const cachedNotes = JSON.parse(localStorage.getItem("notes")) || [];
    setNotes(cachedNotes);
  }, []);

  // Save a new note to localStorage
  const saveNote = () => {
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
          for (const note of cachedNotes) {
            if (!note.savedToPostgres) {
              await fetch("http://localhost:3000/api/notes", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                      content: note.content,
                  }),
              });
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
  
  return (
    <div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="..."
        rows="10"
        cols="50"
      />
      <br/>

      <button onClick={saveNote}>
        Local Save
      </button>

      <button onClick={saveToPostgres}>
        PostgreSQL Save
      </button>

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