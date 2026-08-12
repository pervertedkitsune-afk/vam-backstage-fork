import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { buildHomeSubpathMap, buildHomeSubpathMapFor, findHomeSubpathInDir } from './home-subpath.js'

describe('home-subpath', () => {
  let root

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vam-home-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('returns deepest size-matched non-root subpath', async () => {
    const deep = join(root, 'Creator', 'Looks')
    const shallow = join(root, 'Creator')
    await mkdir(deep, { recursive: true })
    await writeFile(join(deep, 'A.B.1.var'), 'same-bytes')
    await writeFile(join(shallow, 'A.B.1.var'), 'same-bytes')
    await writeFile(join(root, 'A.B.1.var'), 'same-bytes') // root ignored

    expect(await findHomeSubpathInDir(root, 'A.B.1.var', 'same-bytes'.length)).toBe('Creator/Looks')
  })

  it('ignores size-mismatched copies', async () => {
    const deep = join(root, 'Creator', 'Looks')
    await mkdir(deep, { recursive: true })
    await writeFile(join(deep, 'A.B.1.var'), 'wrong-size-content')

    expect(await findHomeSubpathInDir(root, 'A.B.1.var', 4)).toBe('')
  })

  it('skips a mismatched deepest copy and claims a shallower size match', async () => {
    const deep = join(root, 'Creator', 'Looks')
    const shallow = join(root, 'Creator')
    await mkdir(deep, { recursive: true })
    await writeFile(join(deep, 'A.B.1.var'), 'wrong')
    await writeFile(join(shallow, 'A.B.1.var'), 'ok!!')

    expect(await findHomeSubpathInDir(root, 'A.B.1.var', 4)).toBe('Creator')
  })

  it('buildHomeSubpathMap walks once for many filenames', async () => {
    await mkdir(join(root, 'X'), { recursive: true })
    await mkdir(join(root, 'Y', 'Z'), { recursive: true })
    await writeFile(join(root, 'X', 'One.1.var'), 'aaa')
    await writeFile(join(root, 'Y', 'Z', 'Two.1.var'), 'bbbb')

    const map = await buildHomeSubpathMap(
      root,
      new Map([
        ['One.1.var', 3],
        ['Two.1.var', 4],
        ['Missing.1.var', 1],
      ]),
    )
    expect(map.get('One.1.var')).toBe('X')
    expect(map.get('Two.1.var')).toBe('Y/Z')
    expect(map.has('Missing.1.var')).toBe(false)
  })

  it('buildHomeSubpathMapFor bounds to given movers and pulls sizes from the index', async () => {
    await mkdir(join(root, 'X'), { recursive: true })
    await mkdir(join(root, 'Y'), { recursive: true })
    await writeFile(join(root, 'X', 'Mover.1.var'), 'aaa')
    await writeFile(join(root, 'Y', 'Other.1.var'), 'bbbb')

    const index = new Map([
      ['Mover.1.var', { size_bytes: 3 }],
      ['Other.1.var', { size_bytes: 4 }],
    ])
    // Only Mover is a mover — Other must not be walked/claimed even though it exists.
    const map = await buildHomeSubpathMapFor(root, ['Mover.1.var'], index)
    expect(map.get('Mover.1.var')).toBe('X')
    expect(map.has('Other.1.var')).toBe(false)
  })
})
