/* eslint-disable no-console */
import { openai } from "@ai-sdk/openai";
import { createDataStreamResponse, streamText, tool } from "ai";
import { z } from "zod";
import { authenticateWidget, corsResponse } from "@/app/api/widget/utils";
import { fetchPromptRetrievalData } from "@/lib/data/retrieval";

const PROMPT = `You are an AI agent designed to automate browser tasks for {{MAILBOX_NAME}}. Your goal is to accomplish the ultimate task following the rules.

# Input Format
Task
Previous steps
Current URL
Open Tabs
Interactive Elements
[index]<type>text</type>
- index: Numeric identifier for interaction
- type: HTML element type (button, input, etc.)
- text: Element description
Example:
[33]<button>Submit Form</button>

- Only elements with numeric indexes in [] are interactive
- elements without [] provide only context

# Response Rules
1. RESPONSE FORMAT: You must ALWAYS respond calling the AgentOutput tool with the following parameters:
{"current_state": {"evaluation_previous_goal": "Success|Failed|Unknown - Analyze the current elements and the image to check if the previous goals/action are successful like intended by the task. Mention if something unexpected happened. Shortly state why/why not",
"next_goal": "What needs to be done with the next immediate action"},
"action":{"type": "action-type", "parameters": {// action-specific parameter}}}

2. ACTION: Single action is allowed.
Common action sequences:
- Form filling: [{"input_text": {"index": 1, "text": "username"}}, {"input_text": {"index": 2, "text": "password"}}, {"click_element": {"index": 3}}]
- Navigation and extraction: [{"go_to_url": {"url": "https://example.com"}}, {"extract_content": {"goal": "extract the names"}}]
- Actions are executed in the given order
- If the page changes after an action, the sequence is interrupted and you get the new state.
- Only provide the action sequence until an action which changes the page state significantly.

3. ELEMENT INTERACTION:
- Only use indexes of the interactive elements
- Elements marked with "[]Non-interactive text" are non-interactive

4. NAVIGATION & ERROR HANDLING:
- If no suitable elements exist, use other functions to complete the task
- Handle popups/cookies by accepting or closing them
- Use scroll to find elements you are looking for
- If the page is not fully loaded, use wait action

5. TASK COMPLETION:
- Use the done action as the last action as soon as the ultimate task is complete
- Dont use "done" before you are done with everything the user asked you, except you reach the last step of max_steps. 
- If you reach your last step, use the done action even if the task is not fully finished. Provide all the information you have gathered so far. If the ultimate task is completly finished set success to true. If not everything the user asked for is completed set success in done to false!
- Don't hallucinate action
- Make sure you include everything you found out for the ultimate task in the done text parameter. Do not just say you are done, but include the requested information of the task. 

6. Form filling:
- If you fill an input field and your action sequence is interrupted, most often something changed e.g. suggestions popped up under the field.

7. Extraction:
- If your task is to find information - call extract_content on the specific pages to get and store the information.
Your responses must be always JSON with the specified format.
  
IMPORTANT: Only call one action at a time.

Current user email: {{USER_EMAIL}}`;

export async function POST(request: Request) {
  const { messages } = await request.json();

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const { session, mailbox } = authResult;
  const userEmail = session.isAnonymous ? null : session.email || null;

  const systemPrompt = PROMPT.replace("{{USER_EMAIL}}", userEmail || "Anonymous user").replace(
    "{{MAILBOX_NAME}}",
    mailbox.name,
  );

  const tools = {
    AgentOutput: tool({
      description: "Required tool to complete the task, provide the current state, next goal and the action to take",
      parameters: z
        .object({
          current_state: z.object({
            evaluation_previous_goal: z.string(),
            next_goal: z.string(),
          }),
          action: z
            .discriminatedUnion("type", [
              z.object({
                type: z.literal("done"),
                text: z.string(),
                success: z.boolean(),
              }),
              z.object({
                type: z.literal("wait"),
                seconds: z.number().int().default(3),
              }),
              z.object({
                type: z.literal("click_element"),
                index: z.number().int(),
                xpath: z.string().nullable().optional(),
              }),
              z.object({
                type: z.literal("input_text"),
                index: z.number().int(),
                text: z.string(),
                xpath: z.string().nullable().optional(),
              }),
              z.object({
                type: z.literal("send_keys"),
                index: z.number().int(),
                text: z.string(),
              }),
              z.object({
                type: z.literal("scroll_to_element"),
                index: z.number().int(),
              }),
              z.object({
                type: z.literal("get_dropdown_options"),
                index: z.number().int(),
              }),
              z
                .object({
                  type: z.literal("select_option"),
                  index: z.number().int(),
                  text: z.string(),
                })
                .describe("Select an option from a dropdown <select> element"),
            ])
            .describe("Only call one action at a time."),
        })
        .passthrough(),
    }),
  };
  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        system: systemPrompt,
        model: openai("gpt-4.1", { parallelToolCalls: false }),
        temperature: 0.1,
        messages,
        tools,
        toolChoice: "required",
        onError: (error) => {
          console.error("AI stream error", error);
        },
        onFinish: () => {
          console.log("finished AI stream");
        },
      });
      result.mergeIntoDataStream(dataStream);
    },
  });
}
