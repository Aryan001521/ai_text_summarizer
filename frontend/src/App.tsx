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

// 🔥 BACKEND URL
const API_BASE_URL =
  "https://aitextsummarizer-production.up.railway.app";

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
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // ---------------- LOGIN ----------------
  const handleLogin = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/login`,
        {
          email,
          password,
        }
      );

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("email", email);

      setToken(res.data.access_token);

      window.location.reload();
    } catch (err) {
      console.log(err);
      alert("Login failed ❌");
    }
  };

  // ---------------- SIGNUP ----------------
  const handleSignup = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/signup`, {
        username,
        email,
        password,
      });

      alert("Signup successful ✅ Now login");
      setIsSignup(false);
    } catch (err) {
      console.log(err);
      alert("Signup failed ❌");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setToken(null);
    window.location.reload();
  };

  // ---------------- SUMMARIZE ----------------
  const handleSummarize = async () => {
    if (!text && !file) {
      alert("Please enter text or upload PDF");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      if (text) formData.append("text", text);
      if (file) formData.append("file", file);

      const response = await axios.post(
        `${API_BASE_URL}/summarize`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSummary(response.data.summary || "");
      setKeywords(response.data.keywords || []);
    } catch (err) {
      console.log(err);
      alert("Error while summarizing ❌");
    }

    setLoading(false);
  };

  // ---------------- PDF ----------------
  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("AI Text Summarizer Result", 20, 20);

    doc.setFontSize(12);
    doc.text("Summary:", 20, 40);

    const splitSummary = doc.splitTextToSize(summary, 170);
    doc.text(splitSummary, 20, 50);

    doc.text("Keywords:", 20, 120);
    doc.text(keywords.join(", "), 20, 130);

    doc.save("summary.pdf");
  };

  // ---------------- LOGIN PAGE ----------------
  if (!token) {
    return (
      <div className="app auth-page">
        <h1>{isSignup ? "Create Account" : "Login"}</h1>

        <div className="card">
          {isSignup && (
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={isSignup ? handleSignup : handleLogin}>
            {isSignup ? "Signup" : "Login"}
          </button>

          <p onClick={() => setIsSignup(!isSignup)}>
            {isSignup
              ? "Already have account? Login"
              : "New user? Signup"}
          </p>
        </div>
      </div>
    );
  }

  // ---------------- MAIN APP ----------------
  return (
    <div className="app">
      <h1>✨ AI Text Summarizer</h1>

      <div>
        {savedEmail === "admin@gmail.com" && (
          <Link to="/admin">
            <button>Admin Dashboard</button>
          </Link>
        )}

        <button onClick={handleLogout}>Logout</button>
      </div>

      <div className="card">
        <textarea
          placeholder="Paste text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <input type="file" accept=".pdf" onChange={handleFileChange} />

        <button onClick={handleSummarize}>
          {loading ? "Loading..." : "Generate Summary"}
        </button>

        {summary && (
          <div>
            <h3>Summary</h3>
            <p>{summary}</p>

            <h3>Keywords</h3>
            <p>{keywords.join(", ")}</p>

            <button onClick={downloadPDF}>
              Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- ROUTES ----------------
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
