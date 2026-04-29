import { useEffect, useState } from "react";
import axios from "axios";

interface LoginHistoryItem {
  username: string;
  email: string;
  login_time: string;
}

interface DashboardData {
  total_users: number;
  total_logins: number;
  login_history: LoginHistoryItem[];
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/admin/dashboard"
      );

      setData(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  if (!data) {
    return <h2>Loading Dashboard...</h2>;
  }

  return (
    <div style={{ padding: "30px" }}>
      <h1>Admin Analytics Dashboard</h1>

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >
          <h2>Total Users</h2>
          <p>{data.total_users}</p>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >
          <h2>Total Logins</h2>
          <p>{data.total_logins}</p>
        </div>
      </div>

      <h2 style={{ marginTop: "40px" }}>
        Login History
      </h2>

      <table
        border={1}
        cellPadding={10}
        style={{
          marginTop: "20px",
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Login Time</th>
          </tr>
        </thead>

        <tbody>
          {data.login_history.map(
            (item: LoginHistoryItem, index: number) => (
              <tr key={index}>
                <td>{item.username}</td>
                <td>{item.email}</td>
                <td>{item.login_time}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;