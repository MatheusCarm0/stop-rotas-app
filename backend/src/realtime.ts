import type { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import { verifyToken } from "./auth.js";

let io: IOServer | null = null;

export function initRealtime(server: HttpServer): IOServer {
  io = new IOServer(server, { cors: { origin: "*" } });

  // Autentica o socket pelo token e coloca admins numa sala.
  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string) ?? "";
    const user = verifyToken(token);
    if (!user) return next(new Error("Não autenticado"));
    (socket.data as any).user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = (socket.data as any).user;
    if (user?.role === "admin") socket.join("admins");
    socket.on("disconnect", () => {});
  });

  return io;
}

/** Envia um evento para todos os administradores conectados. */
export function emitToAdmins(event: string, payload: unknown) {
  io?.to("admins").emit(event, payload);
}
