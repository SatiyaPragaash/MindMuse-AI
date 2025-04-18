import React, { useState } from "react";

const MOODS = ["Hyperactive", "Anxious", "Tired", "Stressed", "Lonely", "TriggerError"];

const App = () => {
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

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
    <div style={styles.pageBackground}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>MindMuse AI</h1>
      </header>

      <div style={styles.container}>
        <h2 style={styles.title}>🧘 How are you feeling today?</h2>

        <div style={styles.checkboxGroup}>
          {MOODS.map((mood) => (
            <label key={mood} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                value={mood}
                checked={selectedMoods.includes(mood)}
                onChange={() => handleMoodChange(mood)}
                style={styles.checkbox}
              />
              {mood}
            </label>
          ))}
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={handleSubmit} disabled={loading}>
            {loading ? "Generating..." : "Generate Guide"}
          </button>
          <button style={styles.button} onClick={handleFetchLogs}>
            Show Logs
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {pdfUrl && (
          <p style={styles.result}>
            ✅ Guide ready:{" "}
            <a href={pdfUrl} target="_blank" rel="noreferrer">View PDF</a>
          </p>
        )}

        {showLogs && logs.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={styles.subtitle}>📋 Recent Mood Logs</h3>
            <ul style={styles.logList}>
              {logs.map((log) => (
                <li key={log.id}>
                  <strong>{log.mood}</strong> – {new Date(log.timestamp).toLocaleString()} –{" "}
                  <a href={log.guide_url} target="_blank" rel="noreferrer">PDF</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  pageBackground: {
    minHeight: "100vh",
    backgroundImage: "url('https://plus.unsplash.com/premium_vector-1723326082286-34d0975e682d?q=80&w=2960&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem"
  },
  header: {
    backgroundColor: "#16a34a",
    padding: "1rem 0",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    zIndex: 10
  },
  headerTitle: {
    color: "#ffffff",
    margin: 0,
    fontSize: "2rem",
    fontWeight: "bold",
    fontFamily: "Segoe UI, sans-serif"
  },
  container: {
    maxWidth: 600,
    width: "100%",
    marginTop: "2rem",
    padding: "2rem",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0, 100, 0, 0.05)",
    backdropFilter: "blur(6px)"
  },
  title: {
    marginBottom: 35,
    fontSize: "1.6rem",
    textAlign: "center",
    color: "#166534"
  },
  subtitle: {
    marginBottom: 16,
    textAlign: "center",
    color: "#14532d"
  },
  checkboxGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px", 
    justifyContent: "center",
    marginBottom: 16
  },
  checkboxLabel: {
    background: "#d1fae5",
    borderRadius: "20px",
    padding: "8px 14px", 
    cursor: "pointer",
    color: "#064e3b",
    display: "flex",
    alignItems: "center"
  },
  checkbox: {
    marginRight: 6
  },
  buttonGroup: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginTop: 30,
    marginBottom: 16
  },
  button: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold"
  },
  error: {
    color: "#dc2626",
    textAlign: "center",
    marginTop: 16
  },
  result: {
    marginTop: 16,
    textAlign: "center",
    color: "#166534"
  },
  logList: {
    listStyle: "none",
    paddingLeft: 0,
    fontSize: "0.9rem",
    color: "#065f46"
  }
};

export default App;
