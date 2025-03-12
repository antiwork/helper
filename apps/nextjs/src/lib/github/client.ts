import { Octokit } from "@octokit/rest";
import { env } from "@/env";
import { GITHUB_REDIRECT_URI } from "./constants";

export const getGitHubConnectUrl = (mailboxSlug: string): string => {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "repo user",
    state: JSON.stringify({ mailbox_slug: mailboxSlug }),
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

export const getGitHubAccessToken = async (
  code: string,
): Promise<{
  accessToken: string;
}> => {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw data.error_description ? new Error(data.error_description) : new Error("GitHub authentication failed");
  }

  const octokit = new Octokit({ auth: data.access_token });

  return {
    accessToken: data.access_token,
  };
};

export const revokeGitHubToken = async (token: string): Promise<void> => {
  const octokit = new Octokit({
    auth: `Basic ${Buffer.from(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`).toString("base64")}`,
  });

  try {
    await octokit.rest.apps.deleteToken({
      client_id: env.GITHUB_CLIENT_ID,
      access_token: token,
    });
  } catch (error) {
    throw new Error(`Failed to revoke GitHub token: ${(error as Error).message}`);
  }
};

export const listUserRepositories = async (accessToken: string) => {
  const octokit = new Octokit({ auth: accessToken });
  const response = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
  });

  return response.data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    private: repo.private,
  }));
};

export const checkRepositoryIssuesEnabled = async ({
  accessToken,
  owner,
  repo,
}: {
  accessToken: string;
  owner: string;
  repo: string;
}): Promise<boolean> => {
  const octokit = new Octokit({ auth: accessToken });

  // Get repository details to check if issues are enabled
  const { data } = await octokit.repos.get({
    owner,
    repo,
  });

  return data.has_issues;
};

export const listRepositoryIssues = async ({
  accessToken,
  owner,
  repo,
  state = "open",
  per_page = 100,
}: {
  accessToken: string;
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  per_page?: number;
}) => {
  const octokit = new Octokit({ auth: accessToken });

  const { data } = await octokit.issues.listForRepo({
    owner,
    repo,
    state,
    per_page,
    sort: "updated",
    direction: "desc",
  });

  return data.map((issue) => ({
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    updatedAt: issue.updated_at,
  }));
};

export const createGitHubIssue = async ({
  accessToken,
  owner,
  repo,
  title,
  body,
}: {
  accessToken: string;
  owner: string;
  repo: string;
  title: string;
  body: string;
}) => {
  const octokit = new Octokit({ auth: accessToken });
  const response = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
  });

  return {
    issueNumber: response.data.number,
    issueUrl: response.data.html_url,
    issueId: response.data.id,
  };
};

export const updateGitHubIssueState = async ({
  accessToken,
  owner,
  repo,
  issueNumber,
  state,
}: {
  accessToken: string;
  owner: string;
  repo: string;
  issueNumber: number;
  state: "open" | "closed";
}) => {
  const octokit = new Octokit({ auth: accessToken });
  const response = await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state,
  });

  return {
    state: response.data.state,
    issueUrl: response.data.html_url,
  };
};

export const getGitHubIssue = async ({
  accessToken,
  owner,
  repo,
  issueNumber,
}: {
  accessToken: string;
  owner: string;
  repo: string;
  issueNumber: number;
}) => {
  const octokit = new Octokit({ auth: accessToken });
  const response = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  return {
    number: response.data.number,
    state: response.data.state,
    title: response.data.title,
    body: response.data.body,
    url: response.data.html_url,
  };
};
