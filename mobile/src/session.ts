import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  id: number;
  name: string;
  role: "admin" | "worker";
}

const K_TOKEN = "token";
const K_USER = "user";
const K_SHIFT = "activeShiftId";

export async function saveSession(token: string, user: User) {
  await AsyncStorage.multiSet([
    [K_TOKEN, token],
    [K_USER, JSON.stringify(user)],
  ]);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(K_TOKEN);
}

export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(K_USER);
  return raw ? (JSON.parse(raw) as User) : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([K_TOKEN, K_USER, K_SHIFT]);
}

export async function setActiveShift(id: number | null) {
  if (id == null) await AsyncStorage.removeItem(K_SHIFT);
  else await AsyncStorage.setItem(K_SHIFT, String(id));
}

export async function getActiveShift(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(K_SHIFT);
  return raw ? Number(raw) : null;
}

const K_THEME = "themeMode";

export async function getThemeMode(): Promise<"dark" | "light" | null> {
  const raw = await AsyncStorage.getItem(K_THEME);
  return raw === "light" || raw === "dark" ? raw : null;
}

export async function setThemeMode(mode: "dark" | "light") {
  await AsyncStorage.setItem(K_THEME, mode);
}
