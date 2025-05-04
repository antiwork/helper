import { cache } from "react";
import { MarketingPage } from "./marketingPage";

async function getGitHubStars() {
  const response = await fetch("https://api.github.com/repos/antiwork/helper", {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.stargazers_count;
}

const cachedGetGitHubStars = cache(getGitHubStars);

export default async function Page() {
  const stars = await cachedGetGitHubStars();

  return <MarketingPage githubStars={stars} />;
}
