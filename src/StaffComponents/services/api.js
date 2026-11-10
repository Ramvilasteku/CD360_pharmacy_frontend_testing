import axios from "axios";

const api = axios.create({
  // baseURL: "https://api.caredesk360.com",
  baseURL: "http://localhost:5000",

  withCredentials: true, // 🔥 sends cookie automatically
});

export default api;
