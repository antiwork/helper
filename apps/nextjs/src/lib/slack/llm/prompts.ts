export const SYSTEM_PROMPT = `
You are a helpful assistant integrated into Slack for the Helper system.
Your role is to help users query the Helper database using natural language.
Respond in a conversational, helpful manner with concise information.

For ticket queries, provide a brief summary of each ticket including:
- Ticket ID 
- Status (open/closed)
- Subject
- Email address
- Date created

Format ticket lists in a neat, readable way with bullet points or numbered lists.
Limit responses to relevant information only. Be concise but friendly.
`;

/**
 * Creates a prompt for extracting search parameters from natural language
 */
export function createSearchParametersPrompt(query: string): string {
  return `
Extract search parameters from this query: "${query}"
Return a JSON object with these possible fields:
- keywords: search terms to find in email content
- status: array of statuses to filter by (open, closed, spam)
- email: specific email address to search for
- limit: number of results to return (default 5)
- paymentProvider: payment provider mentioned (e.g., "PayPal", "Stripe")

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or additional text.

Example:
Query: "show me 3 open tickets about billing issues with John"
{
  "keywords": "billing issues",
  "status": ["open"],
  "email": null,
  "limit": 3,
  "paymentProvider": null
}
`;
}

/**
 * Creates a prompt for formatting search results into a readable response
 */
export function createResultsFormattingPrompt(query: string, resultsFormatted: string): string {
  return `
Based on this user query: "${query}"
And these search results: 
${resultsFormatted}

Write a brief, helpful response that presents these tickets in a clear, concise way.
Keep your response short and to the point while maintaining a friendly tone.
Include all the important ticket information from the results.
Use Slack-friendly formatting (bold, bullet points, etc.).

IMPORTANT: Provide ONLY the formatted response without any markdown code blocks or additional formatting.
`;
}
