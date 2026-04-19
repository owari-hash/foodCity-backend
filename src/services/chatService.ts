import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import {
  getWelcomeMessageFromSite,
  resolveAutomatedBotReply,
} from "./chatbotFromSite.js";
import { emitNewMessage } from "../socket.js";
import { serializeLean } from "../util/serialize.js";

function emitMsg(convId: string, msg: Record<string, unknown>) {
  emitNewMessage(convId, msg);
}

export async function createOrGetConversation(
  guestId: string,
  displayName?: string,
) {
  let conv = await Conversation.findOne({ guestId });
  if (!conv) {
    conv = await Conversation.create({ guestId, displayName });
    const welcomeFromSite = (await getWelcomeMessageFromSite())?.trim();
    if (welcomeFromSite) {
      await Message.create({
        conversationId: conv._id,
        role: "bot",
        text: welcomeFromSite,
      });
    }
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

  const botText = (await resolveAutomatedBotReply(text))?.trim() ?? "";
  if (!botText) {
    return {
      userMsg: userLean,
      botMsg: null,
      humanMode: Boolean(conv.humanMode),
    };
  }

  const botMsgDoc = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    role: "bot",
    text: botText,
  });
  const botLean = serializeLean(botMsgDoc.toObject() as Record<string, unknown>);
  emitMsg(conversationId, botLean!);

  return {
    userMsg: userLean,
    botMsg: botLean,
    humanMode: Boolean(conv.humanMode),
  };
}

export async function postAgentMessage(
  conversationId: string,
  text: string,
  author?: { displayName?: string; username?: string },
) {
  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new Error("NOT_FOUND");
  const msg = await Message.create({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    role: "agent",
    text,
    ...(author?.displayName ? { agentDisplayName: author.displayName } : {}),
    ...(author?.username ? { agentUsername: author.username } : {}),
  });
  const lean = serializeLean(msg.toObject() as Record<string, unknown>);
  emitMsg(conversationId, lean!);
  return lean;
}
