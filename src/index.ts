import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

// 1. GraphQL Schema
const typeDefs = `#graphql
  type Repository {
    id: ID!
    name: String!
    url: String!
    #TODO:
    # seenByUser: Boolean!
  }

  type Query {
    trackedRepositories: [Repository!]!
    repository(id: ID!): Repository
  }

  type Mutation {
    addRepository(name: String!, url: String!): Repository!
    removeRepository(id: ID!): Boolean!
  }
`;

// 2. Hard-coded data
const repos = [
  { id: "1", name: "react", url: "https://github.com/facebook/react" },
  { id: "2", name: "next.js", url: "https://github.com/vercel/next.js" },
];

// 3. Resolvers
const resolvers = {
  Query: {
    trackedRepositories: () => repos,
    repository: (_parent: undefined, { id }: { id: string }) => repos.find(repo => repo.id === id),
  },

  Mutation: {
    addRepository: (_parent: undefined, args: { name: string; url: string }) => {
      const nameExists = repos.find(repo => repo.name === args.name);
      if (nameExists) {
        throw new Error(`Repository with name "${args.name}" already exists`);
      }

      const urlExists = repos.find(repo => repo.url === args.url);
      if (urlExists) {
        throw new Error(`Repository with URL "${args.url}" already exists`);
      }

      const newRepo = {
        id: String(repos.length + 1),
        ...args,
      };
      repos.push(newRepo);
      return newRepo;
    },
    removeRepository: (_parent: undefined, { id }: { id: string }) => {
      const index = repos.findIndex(repo => repo.id === id);
      if (index > -1) {
        repos.splice(index, 1);
        return true;
      }
      return false;
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
