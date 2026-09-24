// The SAME build artifact is deployed to both Development and Production.
// That means we cannot bake "this is dev" into the build. Instead, the app
// looks at the URL it is being served from at runtime.

export type Environment = 'Development' | 'Production' | 'Local';

export function getEnvironment(pathname: string): Environment {
  if (pathname.startsWith('/cicd-demo-dev')) return 'Development';
  if (pathname.startsWith('/cicd-demo')) return 'Production';
  return 'Local';
}

// Build information is injected by the CI "Build Application" job through
// VITE_* environment variables. Locally they are not set.
export function getBuildInfo() {
  const sha = import.meta.env.VITE_BUILD_SHA ?? 'local';
  const runNumber = import.meta.env.VITE_BUILD_RUN_NUMBER ?? '0';
  return { sha, shortSha: sha.slice(0, 7), runNumber };
}
