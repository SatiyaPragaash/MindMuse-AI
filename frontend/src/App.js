import React, { useState } from "react";

const MOODS = ["Hyperactive", "Anxious", "Tired", "Stressed", "Lonely", "TriggerError"];

const App = () => {
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]); // 🟩 For displaying DynamoDB logs
  const [showLogs, setShowLogs] = useState(false); // 🟩 toggle

  const API_URL = process.env.REACT_APP_API_URL;

  const handleMoodChange = (mood) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handleSubmit = async () => {
    if (selectedMoods.length === 0) {
      setError("Please select at least one mood.");
      return;
    }

    setLoading(true);
    setError("");
    setPdfUrl("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selectedMoods.join(", ") }),
      });

      const data = await response.json();

      if (response.ok) {
        setPdfUrl(data.url);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err) {
      setError("Request failed: " + err.message);
    }

    setLoading(false);
  };

  //Fetch logs from DynamoDB
  const handleFetchLogs = async () => {
    setShowLogs(true);
    try {
      const response = await fetch(API_URL, {
        method: "GET"
      });
      const data = await response.json();
      setLogs(data || []);
    } catch (err) {
      setError("Failed to load logs: " + err.message);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 600, margin: "auto", fontFamily: "Arial" }}>
      <h1>🧘 MindMuse AI</h1>
      <p>How are you feeling today?</p>

      <div style={{ marginBottom: "1rem" }}>
        {MOODS.map((mood) => (
          <label key={mood} style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              value={mood}
              checked={selectedMoods.includes(mood)}
              onChange={() => handleMoodChange(mood)}
            />
            {" "}{mood}
          </label>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Generating Guide..." : "Generate My Wellness Guide"}
      </button>

      <button onClick={handleFetchLogs} style={{ marginLeft: "1rem" }}>
        Show Recent Logs
      </button>

      {error && <p style={{ color: "red", marginTop: 16 }}>{error}</p>}
      {pdfUrl && (
        <p style={{ marginTop: 16 }}>
          ✅ Your guide is ready:{" "}
          <a href={pdfUrl} target="_blank" rel="noreferrer">
            View PDF
          </a>
        </p>
      )}

      {showLogs && logs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>📋 Recent Mood Logs</h3>
          <ul>
            {logs.map((log) => (
              <li key={log.id} style={{ marginBottom: 8 }}>
                <strong>{log.mood}</strong> – {new Date(log.timestamp).toLocaleString()} –{" "}
                <a href={log.guide_url} target="_blank" rel="noreferrer">View PDF</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;
