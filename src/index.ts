import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import pool from "./db";
import { fetchLatestRelease, parseGitHubUrl } from "./github";

// GraphQL Schema
const typeDefs = `#graphql
  type Repo {
    id: ID!
    name: String!
    url: String!
    latestReleaseTag: String
    latestReleaseName: String
    latestReleaseDate: String
    latestReleaseUrl: String
    seenByUser: Boolean
  }

  type Query {
    trackedRepos: [Repo!]!
    repo(id: ID!): Repo
  }

  type Mutation {
    addRepo(name: String!, url: String!): Repo!
    removeRepo(id: ID!): Boolean!
    syncLatestRelease(id: ID!): Repo!
    markRepoSeen(id: ID!): Boolean!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    trackedRepos: async () => {
      const result = await pool.query('SELECT * FROM repos ORDER BY id');
      return result.rows;
    },

    repo: async (_parent: undefined, { id }: { id: string }) => {
      const result = await pool.query('SELECT * FROM repos WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
  },

  Repo: {
    latestReleaseTag: (parent: any) => parent.latest_release_tag,
    latestReleaseName: (parent: any) => parent.latest_release_name,
    latestReleaseDate: (parent: any) => parent.latest_release_date,
    latestReleaseUrl: (parent: any) => parent.latest_release_url,
    seenByUser: (parent: any) => parent.seen_by_user,
  },


  Mutation: {
    // Optionally, we may want to IMMEDIATELY fetch the latest release upon adding a repo
    // For now, leave it off so we can test syncing more easily
    addRepo: async (_parent: undefined, args: { name: string; url: string; }) => {

      // For now, jsut validate the GitHub URL
      const parsed = parseGitHubUrl(args.url);
      if (!parsed) {
        throw new Error('Invalid GitHub URL. Must be in format: https://github.com/owner/repo');
      }

      const nameCheck = await pool.query('SELECT * FROM repos WHERE name = $1', [args.name]);
      if (nameCheck.rows.length > 0) {
        throw new Error('Repo with this name already exists');
      }

      // Check if URL exists
      const urlCheck = await pool.query('SELECT * FROM repos WHERE url = $1', [args.url]);
      if (urlCheck.rows.length > 0) {
        throw new Error('Repo with this URL already exists');
      }

      // Insert new Repo
      const result = await pool.query(
        'INSERT INTO repos (name, url) VALUES ($1, $2) RETURNING *',
        [args.name, args.url]
      );

      return result.rows[0];
    },
    removeRepo: async (_parent: undefined, { id }: { id: string }) => {
      const result = await pool.query('DELETE FROM repos WHERE id = $1', [id]);
      return result.rows.length > 0;
    },

    syncLatestRelease: async (_parent: undefined, { id }: { id: string }) => {
      const repoResult = await pool.query('SELECT * FROM repos WHERE id = $1', [id]);
      const repo = repoResult.rows[0];

      if (!repo) {
        throw new Error('Repository not found');
      }

      const parsed = parseGitHubUrl(repo.url);
      if (!parsed) {
        throw new Error('Invalid GitHub URL');
      }

      const latestRelease = await fetchLatestRelease(parsed.owner, parsed.repo);

      if (!latestRelease) {
        throw new Error('No releases found for this repository');
      }

      const result = await pool.query(
        `UPDATE repos 
         SET latest_release_tag = $1, 
             latest_release_name = $2, 
             latest_release_date = $3, 
             latest_release_url = $4,
             seen_by_user = FALSE
         WHERE id = $5
         RETURNING *`,
        [latestRelease.tag, latestRelease.name, latestRelease.publishedAt, latestRelease.url, id]
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
  }
};

async function start() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });

  console.log(`🚀 GraphQL server ready at: ${url}`);
}

start();
