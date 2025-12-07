import pool from '../db';

export const queries = {
  trackedRepos: async () => {
    const result = await pool.query('SELECT * FROM repos ORDER BY id');
    return result.rows;
  },

  repo: async (_parent: undefined, { id }: { id: string }) => {
    const result = await pool.query('SELECT * FROM repos WHERE id = $1', [id]);
    return result.rows[0] || null;
  },
};