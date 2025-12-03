import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import pool from "./db";

// GraphQL Schema
const typeDefs = `#graphql
  type Repo {
    id: ID!
    name: String!
    url: String!
    #TODO:
    # seenByUser: Boolean!
  }

  type Query {
    trackedRepos: [Repo!]!
    repo(id: ID!): Repo
  }

  type Mutation {
    addRepo(name: String!, url: String!): Repo!
    removeRepo(id: ID!): Boolean!
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

  Mutation: {
    addRepo: async (_parent: undefined, args: { name: string; url: string }) => {
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
