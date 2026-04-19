import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { getBotReply } from "./chatbot.js";
import { emitNewMessage } from "../socket.js";
import { serializeLean } from "../util/serialize.js";

function emitMsg(convId: string, msg: Record<string, unknown>) {
  emitNewMessage(convId, msg);
}

const WELCOME_BOT =
  "Сайн байна уу! FoodCity-т тавтай морилно уу. Захиалга, борлуулалтын зар, ажлын зарын талаар асууж болно. Оператортой ярихыг хүсвэл «Ажилтан авах»-ыг админд идэвхжүүлнэ үү.";

export async function createOrGetConversation(
  guestId: string,
  displayName?: string,
) {
  let conv = await Conversation.findOne({ guestId });
  if (!conv) {
    conv = await Conversation.create({ guestId, displayName });
    await Message.create({
      conversationId: conv._id,
      role: "bot",
      text: WELCOME_BOT,
    });
  } else if (displayName && displayName !== conv.displayName) {
    conv.displayName = displayName;
    await conv.save();
  }
  return conv;
}

export async function postUserMessage(
  conversationId: string,
  guestId: string,
  text: string,
) {
  const conv = await Conversation.findById(conversationId);
  if (!conv || conv.guestId !== guestId) {
    throw new Error("FORBIDDEN");
  }

  const userMsg = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    role: "user",
    text,
  });
  const userLean = serializeLean(userMsg.toObject() as Record<string, unknown>);
  emitMsg(conversationId, userLean!);

  const botText = getBotReply(text);
  const botMsg = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    role: "bot",
    text: botText,
  });
  const botLean = serializeLean(botMsg.toObject() as Record<string, unknown>);
  emitMsg(conversationId, botLean!);

  return { userMsg: userLean, botMsg: botLean };
}

export async function postAgentMessage(conversationId: string, text: string) {
  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new Error("NOT_FOUND");
  const msg = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    role: "agent",
    text,
  });
  const lean = serializeLean(msg.toObject() as Record<string, unknown>);
  emitMsg(conversationId, lean!);
  return lean;
}
