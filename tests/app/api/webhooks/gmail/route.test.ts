import { mockJobs } from "@tests/support/jobsUtils";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/gmail/route";

const jobsMock = mockJobs();

describe("POST /api/webhooks/gmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("triggers a job for Gmail webhook requests", async () => {
    const messageId = "12623166611550058";
    const body = {
      message: {
        data: "eyJfs9ajdf9394jf",
        messageId,
        publishTime: "2024-10-12T19:11:05.982Z",
      },
      subscription: "projects/helper-ai-413611/subscriptions/mail-forwarding-sub",
    };
    const headers = {
      accept: "application/json",
      "accept-encoding": "gzip, deflate, br",
      authorization:
        "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImE1MGY2ZTcwZWY0YjU0OGE1ZmQ5MTQyZWVjZDFmYjhmNTRkY2U5ZWUiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJodHRwczovL2lubi5ncy9lL0dxQzl6WXJkSjhTN3p1WjAtLVptU3lWaV85RWRXQzZvOUNCd1VCakVQLV9xczAwX2M4NHlFQ2ZzanhFQTRfQm1UYl9xM3BpV2hFYmRwalJOWVpzMkdnIiwiYXpwIjoiMTA0MjUzOTk3ODY3ODQ2MDk4MjgwIiwiZW1haWwiOiJzZXJ2aWNlLXB1c2gtYXV0aGVudGljYXRpb25AaGVscGVyLWFpLTQxMzYxMS5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJleHAiOjE3Mjg3NjM4NjYsImlhdCI6MTcyODc2MDI2NiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwic3ViIjoiMTA0MjUzOTk3ODY3ODQ2MDk4MjgwIn0.K0C9Jbu8LmcYqgU8R5HYJB4s9nsuXZjEitaMCtbFNJe4iXj2PWbstO3wgyUrlV6wSRnFufa81qCSt6tCJUCVbg1qXPlWOvId2_8M1PpmVhiFG58Dl-BpMvM3dvOiHizHYY0nKZssZAe0VirPhaavoyIpXy4V_8L3VlF_gdljj6SB31zc8oXSsH86OqM--WMpEptpJTNU6aGQLyR5NkDndNpem1tkaCJYFn_MhOFXNmj99EmV-hUxsXJ5oDuuB6AXW05NiBf0GQKzPiv0mEcOG2VjxpzqUhbqTQ0TPKCopSIXQlmYy2e-zf-cwo4AUoAnatO07PQHKtuJfFTORA1Rmw",
      connection: "keep-alive",
      "content-length": "337",
      "content-type": "application/json",
      from: "noreply@google.com",
      "user-agent": "APIs-Google; (+https://developers.google.com/webmasters/APIs-Google.html)",
    };
    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(jobsMock.triggerEvent).toHaveBeenCalledWith("gmail/webhook.received", {
      body,
      headers,
    });
  });
});
