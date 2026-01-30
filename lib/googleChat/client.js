"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postGoogleChatMessage = postGoogleChatMessage;
/**
 * Send a message to a Google Chat space via webhook.
 * @param webhookUrl The Google Chat webhook URL
 * @param message The message to send (plain text or card JSON)
 */
async function postGoogleChatMessage(webhookUrl, message) {
    const body = typeof message === "string" ? { text: message } : message;
    const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(`Failed to send Google Chat message: ${res.status} ${res.statusText}`);
    }
    return res;
}
