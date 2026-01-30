

// @ts-check
const { postGoogleChatMessage } = require("./client.js");


// Use environment variable for Google Chat webhook URL
/**
 * @type {typeof import('process')}
 */
const process = require('process');
const TEST_WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL || "";

async function testGoogleChat() {
  if (!TEST_WEBHOOK_URL) {
    console.error("No webhook URL set. Set GOOGLE_CHAT_WEBHOOK_URL env variable.");
    process.exit(1);
  }
  try {
    await postGoogleChatMessage(TEST_WEBHOOK_URL, "Test message from Helper App integration.");
    console.log("Message sent successfully.");
  } catch (err) {
    console.error("Failed to send message:", err);
    process.exit(1);
  }
}

testGoogleChat();
