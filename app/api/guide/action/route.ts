import { openai } from "@ai-sdk/openai";
import { appendClientMessage, createDataStreamResponse, generateText, Message, streamText, tool } from "ai";
import { z } from "zod";
import { withWidgetAuth } from "@/app/api/widget/utils";
import { CHAT_MODEL } from "@/lib/ai/core";
import { getGuideSessionActions, getGuideSessionByUuid } from "@/lib/data/guide";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { assertDefined } from "../../../../components/utils/assert";

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
- Actions are executed in the given order
- If the page changes after an action, the sequence is interrupted and you get the new state.
- Only provide the action sequence until an action which changes the page state significantly.
- Make sure we fill all inputs that are required when filling out the form and submit the form.

3. ELEMENT INTERACTION:
- Only use indexes of the interactive elements
- Elements marked with "[]Non-interactive text" are non-interactive

4. NAVIGATION & ERROR HANDLING:
- If no suitable elements exist, use other functions to complete the task
- Handle popups/cookies by accepting or closing them
- If the page is not fully loaded, use wait action

5. TASK COMPLETION:
- Use the done action as the last action as soon as the ultimate task is complete
- Dont use "done" before you are done with everything the user asked you, except you reach the last step of max_steps. 
- If you reach your last step, use the done action even if the task is not fully finished. Provide all the information you have gathered so far. If the ultimate task is completly finished set success to true. If not everything the user asked for is completed set success in done to false!
- Don't hallucinate action
- Make sure you include everything you found out for the ultimate task in the done text parameter. Do not just say you are done, but include the requested information of the task. 

6. Form filling:
- If you fill an input field and your action sequence is interrupted, most often something changed e.g. suggestions popped up under the field.
- Use the required attribute to check if the input is required and plan to fill it even if it is not planned in the steps.
- <input> and <button> elements can have a form attribute. Use it to identify which form the input belongs to and check for required inputs in the form.

Your responses must be always JSON with the specified format.
  
IMPORTANT: Only call one action at a time.
  
Planned steps:
{{PLANNED_STEPS}}

Instructions:
{{INSTRUCTIONS}}

Current date: {{CURRENT_DATE}}
Current user email: {{USER_EMAIL}}`;

export const POST = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  const { message, steps, sessionId } = await request.json();
  const userEmail = session.isAnonymous ? null : session.email || null;

  const guideSession = assertDefined(await getGuideSessionByUuid(sessionId));
  const guideSessionActions = await getGuideSessionActions(guideSession.id);

  const previousMessages: Message[] = guideSessionActions.map((action) => {
    const actionData = action.data as {
      currentState: string;
      actionType: string;
      params: any;
      previousPageDetails: { url: string; title: string; elements: string };
      newPageDetails: { url: string; title: string; elements: string };
      result: string;
    };

    let textResult = "";
    if (actionData.result === "Performed") {
      textResult = `Successfully performed action ${actionData.actionType}
      Now, the current URL is: ${actionData.newPageDetails.url}
      Current Page Title: ${actionData.newPageDetails.title}`;
    } else {
      textResult = `Failed to perform action ${actionData.actionType}`;
    }

    return {
      id: action.id.toString(),
      role: "assistant",
      content: "",
      toolInvocations: [
        {
          id: action.id.toString(),
          toolName: "AgentOutput",
          state: "result",
          result: textResult,
          toolCallId: `call_${action.id}`,
          args: {
            current_state: actionData.currentState,
            action: {
              type: actionData.actionType,
              ...actionData.params,
            },
          },
        },
      ],
    };
  });

  const messages = appendClientMessage({
    messages: previousMessages,
    message,
  });

  const formattedSteps = steps.map((step: any, index: number) => `${index + 1}. ${step.description}`).join("\n");
  const systemPrompt = PROMPT.replace("{{USER_EMAIL}}", userEmail || "Anonymous user")
    .replace("{{MAILBOX_NAME}}", mailbox.name)
    .replace("{{PLANNED_STEPS}}", formattedSteps)
    .replace("{{INSTRUCTIONS}}", guideSession.instructions || "")
    .replace("{{CURRENT_DATE}}", new Date().toISOString());

  const tools = {
    AgentOutput: tool({
      description: "Required tool to complete the task, provide the current state, next goal and the action to take",
      parameters: z
        .object({
          current_state: z.object({
            evaluation_previous_goal: z.string(),
            next_goal: z.string().describe("Next goal to complete, do not include sample values, only actual values"),
            completed_steps: z
              .array(z.number().int())
              .describe("List of steps that have been completed, empty array if none, index starts at 1"),
          }),
          action: z
            .discriminatedUnion("type", [
              z.object({
                type: z.literal("done"),
                text: z.string(),
                success: z.boolean().default(true).optional(),
              }),
              z.object({
                type: z.literal("wait"),
                seconds: z.number().int().default(3),
              }),
              z.object({
                type: z.literal("click_element"),
                index: z.number().int(),
                xpath: z.string().nullable().optional(),
                hasSideEffects: z
                  .boolean()
                  .default(false)
                  .describe(
                    "Whether the action has side effects, e.g. clicking on a button that deletes data, modifying data or creating data",
                  ),
                sideEffectDescription: z
                  .string()
                  .describe(
                    "Description of the side effect/action, e.g. 'Deletes all data from the account', 'Modifies the data of the account', 'Creates a new account'",
                  ),
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

  const model = openai(CHAT_MODEL, { reasoningEffort: "low", structuredOutputs: false, parallelToolCalls: false });

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        system: systemPrompt,
        model,
        temperature: 0.1,
        messages,
        tools,
        toolChoice: "required",
        onError: (error) => {
          captureExceptionAndLog(error);
        },
        experimental_repairToolCall: async ({ toolCall, tools, error, messages, system }) => {
          // eslint-disable-next-line no-console
          console.log("Fixing tool call: ", error);

          const result = await generateText({
            model,
            system,
            messages: [
              ...messages,
              {
                role: "assistant",
                content: [
                  {
                    type: "tool-call",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: toolCall.args,
                  },
                ],
              },
              {
                role: "tool" as const,
                content: [
                  {
                    type: "tool-result",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    result: error.message,
                  },
                ],
              },
            ],
            tools,
          });

          const newToolCall = result.toolCalls.find((newToolCall) => newToolCall.toolName === toolCall.toolName);

          return newToolCall != null
            ? {
                toolCallType: "function" as const,
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                args: JSON.stringify(newToolCall.args),
              }
            : null;
        },
      });
      result.mergeIntoDataStream(dataStream);
    },
  });
});
