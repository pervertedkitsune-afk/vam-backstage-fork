import { beforeEach, describe, expect, it } from 'vitest'
import { useInstalledStore } from './useInstalledStore.js'

describe('useInstalledStore', () => {
  beforeEach(() => {
    useInstalledStore.setState({ byHubResourceId: new Map() })
  })

  it('stores storageState / isDirect / filename for present packages', () => {
    useInstalledStore.getState().update('1', 'archived', false, 'A.B.1.var')
    expect(useInstalledStore.getState().byHubResourceId.get('1')).toEqual({
      storageState: 'archived',
      isDirect: false,
      filename: 'A.B.1.var',
    })
  })

  it('clamps isDirect and filename when storageState is null', () => {
    useInstalledStore.getState().update('1', null, true, 'stale.var')
    expect(useInstalledStore.getState().byHubResourceId.get('1')).toEqual({
      storageState: null,
      isDirect: false,
      filename: null,
    })
  })

  it('applyBatch applies the same clamps and skips unchanged entries', () => {
    useInstalledStore.getState().applyBatch([
      { hubResourceId: '1', storageState: 'enabled', isDirect: true, filename: 'A.B.1.var' },
      { hubResourceId: '2', storageState: null, isDirect: true, filename: 'x.var' },
    ])
    const map = useInstalledStore.getState().byHubResourceId
    expect(map.get('1')).toEqual({ storageState: 'enabled', isDirect: true, filename: 'A.B.1.var' })
    expect(map.get('2')).toEqual({ storageState: null, isDirect: false, filename: null })

    const before = useInstalledStore.getState().byHubResourceId
    useInstalledStore
      .getState()
      .applyBatch([{ hubResourceId: '1', storageState: 'enabled', isDirect: true, filename: 'A.B.1.var' }])
    expect(useInstalledStore.getState().byHubResourceId).toBe(before)
  })
})
