import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, readFile, mkdir, rm, access } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { performCrossDriveMove } from './multidrive.js'

describe('performCrossDriveMove', () => {
  let testDir

  beforeEach(async () => {
    testDir = join(tmpdir(), `multidrive-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true }).catch(() => {})
  })

  it('copies file to destination and unlinks source', async () => {
    const src = join(testDir, 'source.txt')
    const dest = join(testDir, 'subdir', 'dest.txt')
    const content = 'Hello MultiDrive!'

    await writeFile(src, content, 'utf8')
    await performCrossDriveMove(src, dest)

    const destContent = await readFile(dest, 'utf8')
    expect(destContent).toBe(content)

    await expect(access(src)).rejects.toThrow()
  })
})
