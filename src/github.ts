import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  // Add your GitHub token here for higher rate limits (optional)
  // auth: 'your_github_token'
});

export interface LatestRelease {
  tag: string;
  name: string | null;
  publishedAt: string | null;
  url: string;
}

export async function fetchLatestRelease(owner: string, repo: string): Promise<LatestRelease | null> {
  try {
    const { data } = await octokit.repos.getLatestRelease({
      owner,
      repo,
    });

    return {
      tag: data.tag_name,
      name: data.name,
      publishedAt: data.published_at,
      url: data.html_url,
    };
  } catch (error) {
    console.error(`Error fetching latest release for ${owner}/${repo}:`, error);
    return null;
  }
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
  };
}