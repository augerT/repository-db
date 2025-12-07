import pool from '../db';
import { getRepo, fetchLatestRelease } from '../octokit';
import { queries } from './queries';

export const mutations = {
  addRepo: async (_parent: undefined, args: { owner: string; name: string }) => {
    const repo = await getRepo(args.owner, args.name);
    if (!repo) {
      throw new Error('Repository not found on GitHub');
    }

    const result = await pool.query(
      'INSERT INTO repos (id, name, owner, url, seen_by_user) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [repo.id, repo.name, repo.owner, repo.url, false]
    );

    return result.rows[0];
  },

  removeRepo: async (_parent: undefined, { id }: { id: string }) => {
    const result = await pool.query('DELETE FROM repos WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0;
  },

  syncLatestRelease: async (_parent: undefined, { id }: { id: string }) => {
    const repo = await queries.repo(_parent, { id });
    if (!repo) {
      throw new Error('Repository not found in database');
    }

    const latestRelease = await fetchLatestRelease(repo.owner, repo.name);
    if (!latestRelease) {
      throw new Error('No releases found for this repository');
    }

    if (latestRelease.latestReleaseId === repo.latestReleaseId) {
      return repo;
    }

    const result = await pool.query(
      `UPDATE repos 
       SET latest_release_tag = $1, 
           latest_release_name = $2, 
           latest_release_date = $3, 
           latest_release_url = $4,
           latest_release_id = $5,
           seen_by_user = FALSE
       WHERE id = $6
       RETURNING *`,
      [latestRelease.tag, latestRelease.name, latestRelease.publishedAt, latestRelease.url, latestRelease.latestReleaseId, id]
    );

    return result.rows[0];
  },

  markRepoSeen: async (_parent: undefined, { id }: { id: string }) => {
    const result = await pool.query(
      'UPDATE repos SET seen_by_user = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows.length > 0;
  },
};