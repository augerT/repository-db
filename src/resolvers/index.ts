import { queries } from './queries';
import { mutations } from './mutations';
import { repoFieldResolvers } from './repo';

export const resolvers = {
  Query: queries,
  Mutation: mutations,
  Repo: repoFieldResolvers,
};