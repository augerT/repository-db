export const typeDefs = `#graphql
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