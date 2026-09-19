import { describe, it, expect } from 'vitest'
import { resolveOriginalOffloadDirId } from './orig-offload.js'

describe('resolveOriginalOffloadDirId', () => {
  const dirs = [
    { id: 10, path: '/offload1' },
    { id: 20, path: '/offload2' },
  ]

  it('returns null if no offload dirs available', () => {
    expect(resolveOriginalOffloadDirId({ filename: 'test.var' }, [])).toBeNull()
  })

  it('returns original_library_dir_id if present and valid in offload dirs', () => {
    const pkg = { filename: 'test.var', original_library_dir_id: 20 }
    expect(resolveOriginalOffloadDirId(pkg, dirs)).toBe(20)
  })

  it('falls back to first offload dir if original_library_dir_id is missing or invalid', () => {
    const pkg1 = { filename: 'test.var', original_library_dir_id: null }
    expect(resolveOriginalOffloadDirId(pkg1, dirs)).toBe(10)

    const pkg2 = { filename: 'test.var', original_library_dir_id: 999 }
    expect(resolveOriginalOffloadDirId(pkg2, dirs)).toBe(10)
  })
})
