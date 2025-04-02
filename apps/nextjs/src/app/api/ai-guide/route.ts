import { openai } from "@ai-sdk/openai";
import { createDataStreamResponse, streamText, tool } from "ai";
import { z } from "zod";
import { fetchPromptRetrievalData } from "@/lib/data/retrieval";
import { authenticateWidget, corsResponse } from "../widget/utils";

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
{"current_state": {"evaluation_previous_goal": "Success|Failed|Unknown - Analyze the current elements and the image to check if the previous goals/actions are successful like intended by the task. Mention if something unexpected happened. Shortly state why/why not",
"memory": "Description of what has been done and what you need to remember. Be very specific. Count here ALWAYS how many times you have done something and how many remain. E.g. 0 out of 10 websites analyzed. Continue with abc and xyz",
"next_goal": "What needs to be done with the next immediate action"},
"action":[{"one_action_name": {// action-specific parameter}}, // ... more actions in sequence]}

2. ACTIONS: You can specify multiple actions in the list to be executed in sequence. But always specify only one action name per item. Use maximum {max_actions} actions per sequence.
Common action sequences:
- Form filling: [{"input_text": {"index": 1, "text": "username"}}, {"input_text": {"index": 2, "text": "password"}}, {"click_element": {"index": 3}}]
- Navigation and extraction: [{"go_to_url": {"url": "https://example.com"}}, {"extract_content": {"goal": "extract the names"}}]
- Actions are executed in the given order
- If the page changes after an action, the sequence is interrupted and you get the new state.
- Only provide the action sequence until an action which changes the page state significantly.
- Try to be efficient, e.g. fill forms at once, or chain actions where nothing changes on the page
- only use multiple actions if it makes sense.

3. ELEMENT INTERACTION:
- Only use indexes of the interactive elements
- Elements marked with "[]Non-interactive text" are non-interactive

4. NAVIGATION & ERROR HANDLING:
- If no suitable elements exist, use other functions to complete the task
- If stuck, try alternative approaches - like going back to a previous page, new search, new tab etc.
- Handle popups/cookies by accepting or closing them
- Use scroll to find elements you are looking for
- If you want to research something, open a new tab instead of using the current tab
- If captcha pops up, try to solve it - else try a different approach
- If the page is not fully loaded, use wait action

5. TASK COMPLETION:
- Use the done action as the last action as soon as the ultimate task is complete
- Dont use "done" before you are done with everything the user asked you, except you reach the last step of max_steps. 
- If you reach your last step, use the done action even if the task is not fully finished. Provide all the information you have gathered so far. If the ultimate task is completly finished set success to true. If not everything the user asked for is completed set success in done to false!
- If you have to do something repeatedly for example the task says for "each", or "for all", or "x times", count always inside "memory" how many times you have done it and how many remain. Don't stop until you have completed like the task asked you. Only call done after the last step.
- Don't hallucinate actions
- Make sure you include everything you found out for the ultimate task in the done text parameter. Do not just say you are done, but include the requested information of the task. 

6. Form filling:
- If you fill an input field and your action sequence is interrupted, most often something changed e.g. suggestions popped up under the field.

7. Extraction:
- If your task is to find information - call extract_content on the specific pages to get and store the information.
Your responses must be always JSON with the specified format.

Current user email: {{USER_EMAIL}}
`;

export async function POST(request: Request) {
  const { messages } = await request.json();

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const { session, mailbox } = authResult;
  const userEmail = session.isAnonymous ? null : session.email || null;

  let systemPrompt = PROMPT.replace("{{USER_EMAIL}}", userEmail || "Anonymous user").replace(
    "{{MAILBOX_NAME}}",
    mailbox.name,
  );

  const query = messages[messages.length - 1].content;

  if (query && query.length > 0) {
    const { knowledgeBank, websitePagesPrompt } = await fetchPromptRetrievalData(mailbox, query, null);
    if (knowledgeBank) {
      systemPrompt += `\n${knowledgeBank}`;
    }
    if (websitePagesPrompt) {
      systemPrompt += `\n${websitePagesPrompt}`;
    }
  }

  const tools = {
    AgentOutput: tool({
      description: "Required tool to complete the task, provide the current state, next goal and the action(s) to take",
      parameters: z
        .object({
          current_state: z.object({
            evaluation_previous_goal: z.string(),
            memory: z.string(),
            next_goal: z.string(),
          }),
          action: z
            .array(
              z.object({
                done: z
                  .object({
                    text: z.string(),
                    success: z.boolean(),
                  })
                  .nullable()
                  .optional(),
                go_back: z.object({}).nullable().optional(),
                wait: z
                  .object({
                    seconds: z.number().int().default(3),
                  })
                  .nullable()
                  .optional(),
                click_element: z
                  .object({
                    index: z.number().int(),
                    xpath: z.string().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                input_text: z
                  .object({
                    index: z.number().int(),
                    text: z.string(),
                    xpath: z.string().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                extract_content: z
                  .object({
                    goal: z.string(),
                  })
                  .nullable()
                  .optional(),
                scroll_down: z
                  .object({
                    amount: z.number().int().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                scroll_up: z
                  .object({
                    amount: z.number().int().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                send_keys: z
                  .object({
                    keys: z.string(),
                  })
                  .nullable()
                  .optional(),
                scroll_to_text: z
                  .object({
                    text: z.string(),
                  })
                  .nullable()
                  .optional(),
                get_dropdown_options: z
                  .object({
                    index: z.number().int(),
                  })
                  .nullable()
                  .optional(),
                select_dropdown_option: z
                  .object({
                    index: z.number().int(),
                    text: z.string(),
                  })
                  .nullable()
                  .optional(),
              }),
            )
            .min(1),
        })
        .passthrough(),
    }),
  };
  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        system: systemPrompt,
        model: openai("gpt-4o"),
        messages,
        tools,
        toolChoice: "required",
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
