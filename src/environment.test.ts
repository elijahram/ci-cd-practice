import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBuildInfo, getEnvironment } from './environment';

describe('getEnvironment', () => {
  it('detects Development from the dev GitHub Pages path', () => {
    expect(getEnvironment('/cicd-demo-dev/')).toBe('Development');
  });

  it('detects Production from the prod GitHub Pages path', () => {
    expect(getEnvironment('/cicd-demo/')).toBe('Production');
  });

  it('falls back to Local for anything else', () => {
    expect(getEnvironment('/')).toBe('Local');
  });
});

describe('getBuildInfo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the commit SHA and run number injected by CI', () => {
    vi.stubEnv('VITE_BUILD_SHA', 'abcdef1234567890');
    vi.stubEnv('VITE_BUILD_RUN_NUMBER', '42');
    expect(getBuildInfo()).toEqual({
      sha: 'abcdef1234567890',
      shortSha: 'abcdef1',
      runNumber: '42',
    });
  });

  it('falls back to "local" when not built by CI', () => {
    expect(getBuildInfo()).toEqual({ sha: 'local', shortSha: 'local', runNumber: '0' });
  });
});
