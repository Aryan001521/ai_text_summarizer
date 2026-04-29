import { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import AdminDashboard from "./Pages/AdminDashboard";
import "./App.css";

const API = "https://aitextsummarizer-production.up.railway.app";

function MainApp() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  const [savedEmail] = useState<string | null>(
    localStorage.getItem("email")
  );

  const [isSignup, setIsSignup] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0]);
    }
  };

  // ---------------- LOGIN ----------------
  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API}/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("email", email);

      setToken(res.data.access_token);
    } catch (err) {
      console.log(err);
      alert("Login failed");
    }
  };

  // ---------------- SIGNUP ----------------
  const handleSignup = async () => {
    try {
      await axios.post(`${API}/signup`, {
        username,
        email,
        password,
      });

      alert("Signup successful");
      setIsSignup(false);
    } catch (err) {
      console.log(err);
      alert("Signup failed");
    }
  };

  // ---------------- LOGOUT ----------------
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setToken(null);
  };

  // ---------------- SUMMARIZE ----------------
  const handleSummarize = async () => {
    if (!text && !file) return alert("Enter text or upload PDF");

    setLoading(true);

    try {
      const formData = new FormData();

      if (text) formData.append("text", text);
      if (file) formData.append("file", file);

      const res = await axios.post(`${API}/summarize`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSummary(res.data.summary);
      setKeywords(res.data.keywords);
    } catch (err) {
      console.log(err);
      alert("Error while summarizing");
    }

    setLoading(false);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.text("AI Summary", 20, 20);
    doc.text(summary, 20, 40);

    doc.text("Keywords:", 20, 100);
    doc.text(keywords.join(", "), 20, 110);

    doc.save("summary.pdf");
  };

  // ---------------- LOGIN PAGE ----------------
  if (!token) {
    return (
      <div className="app">
        <h1>{isSignup ? "Signup" : "Login"}</h1>

        {isSignup && (
          <input
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
          />
        )}

        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={isSignup ? handleSignup : handleLogin}>
          {isSignup ? "Signup" : "Login"}
        </button>

        <p onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? "Go to Login" : "Go to Signup"}
        </p>
      </div>
    );
  }

  // ---------------- MAIN APP ----------------
  return (
    <div className="app">
      <h1>AI Text Summarizer</h1>

      <button onClick={handleLogout}>Logout</button>

      <textarea
        placeholder="Enter text"
        onChange={(e) => setText(e.target.value)}
      />

      <input type="file" onChange={handleFileChange} />

      <button onClick={handleSummarize}>
        {loading ? "Loading..." : "Summarize"}
      </button>

      {summary && (
        <div>
          <h3>Summary</h3>
          <p>{summary}</p>

          <h3>Keywords</h3>
          <p>{keywords.join(", ")}</p>

          <button onClick={downloadPDF}>Download PDF</button>
        </div>
      )}
    </div>
  );
}

// ---------------- ROUTER ----------------
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}
