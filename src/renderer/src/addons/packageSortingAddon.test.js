// [AddOn] PackageSorting_Begin
import { describe, it, expect, vi } from 'vitest'
import { PackageSortingAddon } from './packageSortingAddon'
import { useLibraryStore } from '../stores/useLibraryStore'
import { useContentStore } from '../stores/useContentStore'

describe('PackageSortingAddon', () => {
  const sampleLibraryItems = [
    { filename: 'c.var', packageName: 'Charlie.Pkg', creator: 'Zack' },
    { filename: 'a.var', packageName: 'Alpha.Pkg', creator: 'Bob' },
    { filename: 'b.var', packageName: 'Bravo.Pkg', creator: 'Alice' },
  ]

  const sampleContentItems = [
    {
      id: 'c1',
      displayName: 'Look 3',
      packageFilename: 'Charlie.Pkg.var',
      package: { packageName: 'Charlie.Pkg', creator: 'Zack' },
    },
    {
      id: 'a1',
      displayName: 'Look 1',
      packageFilename: 'Alpha.Pkg.var',
      package: { packageName: 'Alpha.Pkg', creator: 'Bob' },
    },
    {
      id: 'b1',
      displayName: 'Look 2',
      packageFilename: 'Bravo.Pkg.var',
      package: { packageName: 'Bravo.Pkg', creator: 'Alice' },
    },
  ]

  describe('sortLibraryItems', () => {
    it('returns unmodified items if sortColumn is null', () => {
      const result = PackageSortingAddon.sortLibraryItems(sampleLibraryItems, null)
      expect(result).toBe(sampleLibraryItems)
    })

    it('sorts library items by package name in asc and desc order', () => {
      const asc = PackageSortingAddon.sortLibraryItems(sampleLibraryItems, 'package', 'asc')
      expect(asc.map((i) => i.packageName)).toEqual(['Alpha.Pkg', 'Bravo.Pkg', 'Charlie.Pkg'])

      const desc = PackageSortingAddon.sortLibraryItems(sampleLibraryItems, 'package', 'desc')
      expect(desc.map((i) => i.packageName)).toEqual(['Charlie.Pkg', 'Bravo.Pkg', 'Alpha.Pkg'])
    })

    it('sorts library items by author name in asc and desc order', () => {
      const asc = PackageSortingAddon.sortLibraryItems(sampleLibraryItems, 'author', 'asc')
      expect(asc.map((i) => i.creator)).toEqual(['Alice', 'Bob', 'Zack'])

      const desc = PackageSortingAddon.sortLibraryItems(sampleLibraryItems, 'author', 'desc')
      expect(desc.map((i) => i.creator)).toEqual(['Zack', 'Bob', 'Alice'])
    })
  })

  describe('sortContentItems', () => {
    it('returns unmodified items if sortColumn is null', () => {
      const result = PackageSortingAddon.sortContentItems(sampleContentItems, null)
      expect(result).toBe(sampleContentItems)
    })

    it('sorts content items by package name in asc and desc order', () => {
      const asc = PackageSortingAddon.sortContentItems(sampleContentItems, 'package', 'asc')
      expect(asc.map((i) => i.package.packageName)).toEqual(['Alpha.Pkg', 'Bravo.Pkg', 'Charlie.Pkg'])

      const desc = PackageSortingAddon.sortContentItems(sampleContentItems, 'package', 'desc')
      expect(desc.map((i) => i.package.packageName)).toEqual(['Charlie.Pkg', 'Bravo.Pkg', 'Alpha.Pkg'])
    })

    it('sorts content items by author in asc and desc order', () => {
      const asc = PackageSortingAddon.sortContentItems(sampleContentItems, 'author', 'asc')
      expect(asc.map((i) => i.package.creator)).toEqual(['Alice', 'Bob', 'Zack'])

      const desc = PackageSortingAddon.sortContentItems(sampleContentItems, 'author', 'desc')
      expect(desc.map((i) => i.package.creator)).toEqual(['Zack', 'Bob', 'Alice'])
    })
  })

  describe('triggerRescanSort', () => {
    it('sets primary sort on library and content stores', () => {
      const spyLib = vi.fn()
      const spyContent = vi.fn()

      vi.spyOn(useLibraryStore, 'getState').mockReturnValue({ setPrimarySort: spyLib })
      vi.spyOn(useContentStore, 'getState').mockReturnValue({ setPrimarySort: spyContent })

      PackageSortingAddon.triggerRescanSort()

      expect(spyLib).toHaveBeenCalledWith('Name')
      expect(spyContent).toHaveBeenCalledWith('Package')
    })
  })
})
// [AddOn] PackageSorting_End
