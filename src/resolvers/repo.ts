export const repoFieldResolvers = {
  latestReleaseTag: (parent: any) => parent.latest_release_tag,
  latestReleaseName: (parent: any) => parent.latest_release_name,
  latestReleaseDate: (parent: any) => parent.latest_release_date,
  latestReleaseUrl: (parent: any) => parent.latest_release_url,
  latestReleaseId: (parent: any) => parent.latest_release_id,
  seenByUser: (parent: any) => parent.seen_by_user,
};