// [AddOn] NoLabels_Begin
import { describe, it, expect } from 'vitest'
import { NoLabelsAddon, NO_LABEL_ID, NO_LABEL_NAME } from './noLabelsAddon'

describe('NoLabelsAddon', () => {
  it('correctly identifies no label values', () => {
    expect(NoLabelsAddon.isNoLabelValue('no label')).toBe(true)
    expect(NoLabelsAddon.isNoLabelValue('nolabel')).toBe(true)
    expect(NoLabelsAddon.isNoLabelValue('no labels')).toBe(true)
    expect(NoLabelsAddon.isNoLabelValue('nolabels')).toBe(true)
    expect(NoLabelsAddon.isNoLabelValue(NO_LABEL_ID)).toBe(true)
    expect(NoLabelsAddon.isNoLabelValue('NO LABEL')).toBe(true)
    expect(NoLabelsAddon.isNoLabelValue('custom-label')).toBe(false)
  })

  it('creates synthetic no label item', () => {
    const item = NoLabelsAddon.getNoLabelItem(5)
    expect(item).toEqual({
      id: NO_LABEL_ID,
      name: NO_LABEL_NAME,
      isSynthetic: true,
      packageCount: 5,
      contentCount: 5,
    })
  })

  it('checks if haystack is unlabelled', () => {
    expect(NoLabelsAddon.isUnlabelled([])).toBe(true)
    expect(NoLabelsAddon.isUnlabelled(null)).toBe(true)
    expect(NoLabelsAddon.isUnlabelled(undefined)).toBe(true)
    expect(NoLabelsAddon.isUnlabelled(['label-1'])).toBe(false)
  })
})
// [AddOn] NoLabels_End
