export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const TOKEN_KEY = "auth_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (data && data.detail) detail = data.detail;
    } catch {
      // response wasn't JSON — keep statusText
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) => request(path, { method: "POST", body });
export const apiPatch = (path, body) => request(path, { method: "PATCH", body });
export const apiPut = (path, body) => request(path, { method: "PUT", body });
export const apiDelete = (path) => request(path, { method: "DELETE" });
