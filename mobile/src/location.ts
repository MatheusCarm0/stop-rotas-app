import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import Constants from "expo-constants";
import { API_URL, LOCATION_TASK } from "./config";
import { getActiveShift, getToken } from "./session";

// Rastreamento em segundo plano NÃO funciona no Expo Go (Android). Só em APK/dev build.
export const backgroundAvailable = Constants.executionEnvironment !== "storeClient";

// Task de background: recebe lotes de posições e envia ao backend.
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
  if (error) return;
  const locs: Location.LocationObject[] | undefined = data?.locations;
  if (!locs?.length) return;

  const shiftId = await getActiveShift();
  const token = await getToken();
  if (!shiftId || !token) return;

  const points = locs.map((l) => ({
    lat: l.coords.latitude,
    lng: l.coords.longitude,
    speed: l.coords.speed ?? null,
    moving: (l.coords.speed ?? 0) > 0.6,
    recorded_at: new Date(l.timestamp).toISOString(),
  }));

  try {
    await fetch(`${API_URL}/api/shifts/${shiftId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ points }),
    });
  } catch {
    // offline: numa evolução, guardar em fila local e reenviar depois
  }
});

export async function requestPermissions(): Promise<{ ok: boolean; background: boolean }> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return { ok: false, background: false };
  if (!backgroundAvailable) return { ok: true, background: false };
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    return { ok: true, background: bg.status === "granted" };
  } catch {
    return { ok: true, background: false };
  }
}

/** Liga o rastreamento em segundo plano. Retorna false no Expo Go (usa só o 1º plano). */
export async function startTracking(): Promise<boolean> {
  if (!backgroundAvailable) return false;
  try {
    const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (already) return true;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 3000,
      distanceInterval: 4,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: "Stop Rotas — expediente ativo",
        notificationBody: "Registrando o trajeto da sua distribuição.",
        notificationColor: "#e1231c",
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopTracking() {
  if (!backgroundAvailable) return;
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    // ignora
  }
}
