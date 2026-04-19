import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { Conversation } from "./models/Conversation.js";

let io: Server | null = null;

function roomForConversation(conversationId: string) {
  return `conv:${conversationId}`;
}

export function initSocket(server: HttpServer, corsOrigins: string[]): Server {
  io = new Server(server, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.on("connection", (socket: Socket) => {
    socket.on(
      "join",
      async (
        payload: {
          conversationId: string;
          guestId?: string;
          asAdmin?: boolean;
        },
        ack?: (err: Error | null) => void,
      ) => {
        try {
          const { conversationId, guestId, asAdmin } = payload;
          const conv = await Conversation.findById(conversationId);
          if (!conv) {
            ack?.(new Error("NOT_FOUND"));
            return;
          }
          if (asAdmin) {
            await socket.join(roomForConversation(conversationId));
            ack?.(null);
            return;
          }
          if (!guestId || conv.guestId !== guestId) {
            ack?.(new Error("FORBIDDEN"));
            return;
          }
          await socket.join(roomForConversation(conversationId));
          ack?.(null);
        } catch (e) {
          ack?.(e instanceof Error ? e : new Error("JOIN_FAILED"));
        }
      },
    );

    socket.on(
      "leave",
      async (
        payload: { conversationId?: string },
        ack?: (err: Error | null) => void,
      ) => {
        try {
          const id = payload?.conversationId?.trim();
          if (!id) {
            ack?.(new Error("INVALID"));
            return;
          }
          await socket.leave(roomForConversation(id));
          ack?.(null);
        } catch (e) {
          ack?.(e instanceof Error ? e : new Error("LEAVE_FAILED"));
        }
      },
    );
  });

  return io;
}

export function emitNewMessage(
  conversationId: string,
  message: Record<string, unknown>,
) {
  io?.to(roomForConversation(conversationId)).emit("message:new", {
    conversationId,
    message,
  });
}
