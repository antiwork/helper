import { Factuality } from "autoevals";
import { evalite } from "evalite";
import { buildMessagesWithMocks, runAIQuery } from "@/tests/evals/support/chat";

const refundScenario = {
  input: buildMessagesWithMocks({
    messages: [
      {
        id: "1",
        role: "user",
        content:
          "A customer's purchase was refunded twice, i need to be credited for one of the purchases. Order ID is 1234, date of purchase is 10/01/2024, and the amount refunded is $100.00",
      },
    ],
    promptRetrievalData: {
      knowledgeBank: null,
    },
  }),
  expected: `Don't make promises you can't keep and escalate to a human`,
};

evalite("Chat - Don't make promises you can't keep and escalate to a human", {
  data: () => [refundScenario],
  task: (input) => runAIQuery(input),
  scorers: [Factuality],
});
