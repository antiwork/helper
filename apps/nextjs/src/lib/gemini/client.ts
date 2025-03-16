import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/env";

export const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export const getGeminiModel = (modelName = "gemini-1.5-flash") => {
  return genAI.getGenerativeModel({ model: modelName });
};

export const generateContent = async (prompt: string, modelName = "gemini-1.5-flash") => {
  const model = getGeminiModel(modelName);
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// Function to classify intent from a message
export const classifyIntent = async (
  message: string,
): Promise<{
  intent: string;
  parameters: Record<string, any>;
}> => {
  const prompt = `
    You are a helper bot that classifies user intents from messages. 
    Analyze the following message and determine the user's intent.
    Return a JSON object with the following structure:
    {
      "intent": "one of [search_tickets, get_stats, close_tickets, reply_to_tickets, unknown]",
      "parameters": {
        // Extract relevant parameters based on the intent
        // For search_tickets: criteria, limit, mailbox (required if mentioned)
        // For get_stats: timeframe, mailbox (optional)
        // For close_tickets: criteria, reason, mailbox (required if mentioned)
        // For reply_to_tickets: criteria, message, mailbox (required if mentioned)
      }
    }

    Important Pattern Recognition Rules:
    1. "Give me X ticket(s)" or "Show me X ticket(s)" or "Find X ticket(s)" = search_tickets intent
    2. "Give me X ticket(s) to respond to" = search_tickets intent (NOT reply_to_tickets)
    3. "Reply to all tickets" or "Respond to all tickets" = reply_to_tickets intent (requires message parameter)
    4. "How many tickets" or "ticket stats" or "ticket count" = get_stats intent
    5. "Close tickets" or "Mark tickets as closed" = close_tickets intent

    For search_tickets intent:
    - If the user asks for tickets "to respond to" or "about X" or "regarding X", this is a search for tickets they can manually respond to
    - The word "about" or phrases like "regarding X" or "related to X" indicate search criteria
    
    For reply_to_tickets intent:
    - This should ONLY be classified when the user explicitly wants to SEND a reply to multiple tickets
    - Must include both what tickets to reply to AND what message to send
    - If no message to send is provided, use search_tickets instead

    For the mailbox parameter, extract any mention of a specific mailbox name (e.g., "in the Flexile mailbox", "for Gumroad", etc.).
    Look for phrases like "in mailbox X", "from mailbox X", "for mailbox X", etc.
    
    For search_tickets, close_tickets, and reply_to_tickets intents:
    - Always try to extract a mailbox name if mentioned in the message
    - If no mailbox is explicitly mentioned, do not set a mailbox parameter
    - Be thorough in identifying mailbox references, as this is important for proper operation
    
    For timeframe in get_stats:
    - If the user asks for statistics without specifying a timeframe (e.g., "how many tickets do we have?", "total tickets"), set timeframe to "all" to get all-time statistics.
    - If the user mentions a specific timeframe like "last 24 hours", "last week", "last month", set that as the timeframe.
    - If the user explicitly asks for "all" or "total" tickets, set timeframe to "all".

    Message: "${message}"
  `;

  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const jsonMatch = /\{[\s\S]*\}/.exec(responseText);
    if (jsonMatch) {
      const parsedResult = JSON.parse(jsonMatch[0]);

      if (parsedResult.intent === "get_stats" && !parsedResult.parameters.timeframe) {
        parsedResult.parameters.timeframe = "all";
      }

      return parsedResult;
    }
    throw new Error("No valid JSON found in response");
  } catch (error) {
    console.error("Error parsing intent classification:", error);
    return {
      intent: "unknown",
      parameters: {},
    };
  }
};
