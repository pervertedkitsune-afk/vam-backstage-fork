import { describe, expect, it } from 'vitest'
import { resolveHubInstallState } from './useHubInstallState.js'

describe('resolveHubInstallState', () => {
  it('prefers download activity over local presence', () => {
    expect(
      resolveHubInstallState({
        storageState: 'enabled',
        isDirect: true,
        dlActive: true,
      }),
    ).toBe('downloading')
    expect(
      resolveHubInstallState({
        storageState: null,
        isDirect: false,
        pendingInstall: true,
      }),
    ).toBe('queued')
  })

  it('maps presence facets: archived before direct/dep', () => {
    expect(resolveHubInstallState({ storageState: 'archived', isDirect: true })).toBe('archived')
    expect(resolveHubInstallState({ storageState: 'archived', isDirect: false })).toBe('archived')
    expect(resolveHubInstallState({ storageState: 'enabled', isDirect: true })).toBe('installed')
    expect(resolveHubInstallState({ storageState: 'disabled', isDirect: false })).toBe('installed-dep')
    expect(resolveHubInstallState({ storageState: 'offloaded', isDirect: true })).toBe('installed')
  })

  it('falls through to external / failed / install when absent', () => {
    expect(resolveHubInstallState({ storageState: null, isDirect: false, isExternal: true })).toBe('external')
    expect(
      resolveHubInstallState({ storageState: null, isDirect: false, mainDlStatus: 'failed' }),
    ).toBe('failed')
    expect(resolveHubInstallState({ storageState: null, isDirect: false })).toBe('install')
  })
})
