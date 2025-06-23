import crypto from "crypto";
import { memoize } from "lodash-es";
import { App } from "octokit";
import { env } from "@/lib/env";

const privateKeyPkcs8 = memoize(() => {
  if (!env.GITHUB_PRIVATE_KEY) throw new Error("GITHUB_PRIVATE_KEY is not set");
  return crypto.createPrivateKey(env.GITHUB_PRIVATE_KEY).export({
    type: "pkcs8",
    format: "pem",
  }) as string;
});

export const getGitHubInstallUrl = () => `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`;

const getOctokit = (installationId: string) => {
  if (!env.GITHUB_APP_ID) throw new Error("GITHUB_APP_ID is not set");
  const app = new App({ appId: env.GITHUB_APP_ID, privateKey: privateKeyPkcs8() });
  return app.getInstallationOctokit(Number(installationId));
};

export const listRepositories = async (installationId: string) => {
  const octokit = await getOctokit(installationId);
  const repos = await octokit.rest.apps.listReposAccessibleToInstallation({
    sort: "updated",
    per_page: 100,
  });

  return repos.data.repositories.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    private: repo.private,
  }));
};

export const checkRepositoryIssuesEnabled = async ({
  installationId,
  owner,
  repo,
}: {
  installationId: string;
  owner: string;
  repo: string;
}): Promise<boolean> => {
  const octokit = await getOctokit(installationId);
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data.has_issues;
};

export const listRepositoryIssues = async ({
  installationId,
  owner,
  repo,
  state = "open",
  per_page = 100,
}: {
  installationId: string;
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  per_page?: number;
}) => {
  const octokit = await getOctokit(installationId);

  const { data } = await octokit.rest.issues.listForRepo({
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
  installationId,
  owner,
  repo,
  title,
  body,
}: {
  installationId: string;
  owner: string;
  repo: string;
  title: string;
  body: string;
}) => {
  const octokit = await getOctokit(installationId);
  const response = await octokit.rest.issues.create({
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

export const getGitHubIssue = async ({
  installationId,
  owner,
  repo,
  issueNumber,
}: {
  installationId: string;
  owner: string;
  repo: string;
  issueNumber: number;
}) => {
  const octokit = await getOctokit(installationId);
  const response = await octokit.rest.issues.get({
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
