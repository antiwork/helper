export const sendSlackResponse = async (responseUrl: string, message: any) => {
  const response = await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    console.error("Failed to send Slack response:", await response.text());
  }

  return response;
};

export const sendHelpMessage = async (responseUrl: string) => {
  await sendSlackResponse(responseUrl, {
    response_type: "ephemeral",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Helper Commands",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*1. Assign a Ticket*\n`/helper assign [search term]`\nExample: `/helper assign paypal`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*2. View Statistics*\n`/helper stats [timeframe]`\nExample: `/helper stats 7d`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*3. Close Tickets*\n`/helper close --older-than [days]d --about [search term]`\nExample: `/helper close --older-than 30d --about paypal`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: '*4. Reply to Tickets*\n`/helper reply --about [search term] --message "Your message"`\nExample: `/helper reply --about verification --message "This issue has been resolved!"`',
        },
      },
    ],
  });
};
