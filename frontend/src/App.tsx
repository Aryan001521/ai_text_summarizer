import { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from "react-router-dom";

import AdminDashboard from "./Pages/AdminDashboard";
import "./App.css";

// ✅ PRODUCTION BACKEND URL
const API_URL = "https://ai-text-summarizer-production.up.railway.app";

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

  const [text, setText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // ---------------- LOGIN ----------------
  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("email", email);

      setToken(res.data.access_token);
      window.location.reload();
    } catch {
      alert("Login failed");
    }
  };

  // ---------------- SIGNUP ----------------
  const handleSignup = async () => {
    try {
      await axios.post(`${API_URL}/signup`, {
        username,
        email,
        password,
      });

      alert("Signup successful, now login");
      setIsSignup(false);
    } catch {
      alert("Signup failed");
    }
  };

  // ---------------- LOGOUT ----------------
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");

    setToken(null);
    window.location.reload();
  };

  // ---------------- SUMMARIZE ----------------
  const handleSummarize = async () => {
    if (!text && !file) {
      alert("Please enter text or upload a PDF");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      if (text) {
        formData.append("text", text);
      }

      if (file) {
        formData.append("file", file);
      }

      const response = await axios.post(
        `${API_URL}/summarize`,
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
    } catch {
      alert("Error while summarizing");
    }

    setLoading(false);
  };

  // ---------------- DOWNLOAD PDF ----------------
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

  // ---------------- LOGIN / SIGNUP SCREEN ----------------
  if (!token) {
    return (
      <div className="app auth-page">
        <h1>{isSignup ? "Create Account" : "Welcome Back"}</h1>

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

          <p
            className="toggle-text"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup
              ? "Already have account? Login"
              : "New user? Create account"}
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

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="card">
        <textarea
          placeholder="Paste your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <input type="file" accept=".pdf" onChange={handleFileChange} />

        {file && <p>📄 {file.name}</p>}

        <button onClick={handleSummarize}>
          {loading ? "Generating..." : "Generate Summary"}
        </button>

        {summary && (
          <div className="result-box">
            <h3>Summary</h3>
            <p>{summary}</p>

            <h3>Keywords</h3>
            <ul>
              {keywords.map((word, i) => (
                <li key={i}>{word}</li>
              ))}
            </ul>

            <button onClick={downloadPDF}>
              Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- ROUTER ----------------
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
