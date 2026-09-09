import { API_URL } from "./config";
import { getToken, saveSession, type User } from "./session";

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/api${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data as T;
}

export const api = {
  async login(username: string, password: string) {
    const data = await request<{ token: string; user: User }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
      false
    );
    await saveSession(data.token, data.user);
    return data;
  },

  startShift: () => request<any>("/shifts/start", { method: "POST" }),
  endShift: (id: number) => request<any>(`/shifts/${id}/end`, { method: "POST" }),
  getShift: (id: number) => request<any>(`/shifts/${id}`),
  addDelivery: (id: number, body: { lat?: number | null; lng?: number | null; note?: string | null }) =>
    request<any>(`/shifts/${id}/deliveries`, { method: "POST", body: JSON.stringify(body) }),

  activeShifts: () => request<any[]>("/shifts/active"),
  reportToday: () => request<any>("/reports/today"),
  reportMonthly: (months = 6) => request<any[]>(`/reports/monthly?months=${months}`),
  reportPerformance: () => request<any[]>("/reports/performance"),

  listEmployees: () => request<any[]>("/employees"),
  createEmployee: (body: { name: string; username: string; password: string; role: "admin" | "worker" }) =>
    request<any>("/employees", { method: "POST", body: JSON.stringify(body) }),
};
