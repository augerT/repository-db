import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import pool from "./db";
import { getRepo, fetchLatestRelease } from "./github";

// GraphQL Schema
const typeDefs = `#graphql
  type Repo {
    id: ID!
    name: String!
    url: String!
    owner: String!
    latestReleaseId: ID
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
    addRepo(name: String!, owner: String!): Repo!
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
    latestReleaseId: (parent: any) => parent.latest_release_id,
    seenByUser: (parent: any) => parent.seen_by_user,
  },


  Mutation: {
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
      // Get repo from our repo resolver
      const repo = await resolvers.Query.repo(_parent, { id });
      if (!repo) {
        throw new Error('Repository not found in database');
      }

      // Fetch latest release from GitHub
      const latestRelease = await fetchLatestRelease(repo.owner, repo.name);
      if (!latestRelease) {
        throw new Error('No releases found for this repository');
      }

      // No update needed
      if(latestRelease.latestReleaseId === repo.latestReleaseId) {
        return repo;
      }

      // Update the database with the latest release info
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
