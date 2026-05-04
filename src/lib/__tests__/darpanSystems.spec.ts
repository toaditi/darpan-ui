import { describe, expect, it } from 'vitest'
import {
  canonicalDarpanSystemEnumId,
  darpanSystemDisplayLabel,
  darpanSystemIdsMatch,
  deduplicateDarpanSystemOptions,
} from '../utils/darpanSystems'

describe('darpanSystems', () => {
  it('maps legacy Darpan system aliases to canonical enum IDs', () => {
    expect(canonicalDarpanSystemEnumId('DarSysShopify')).toBe('SHOPIFY')
    expect(canonicalDarpanSystemEnumId('DarSysOms')).toBe('OMS')
    expect(canonicalDarpanSystemEnumId('DarSysNetSuite')).toBe('NETSUITE')
    expect(canonicalDarpanSystemEnumId('DarSysSapi')).toBe('SAPI')
  })

  it('matches legacy and canonical system IDs', () => {
    expect(darpanSystemIdsMatch('DarSysShopify', 'SHOPIFY')).toBe(true)
    expect(darpanSystemIdsMatch('DarSysOms', 'OMS')).toBe(true)
    expect(darpanSystemIdsMatch('SHOPIFY', 'OMS')).toBe(false)
  })

  it('uses canonical display labels for old system rows', () => {
    expect(darpanSystemDisplayLabel('DarSysOms', 'OMS')).toBe('HotWax')
    expect(darpanSystemDisplayLabel('DarSysShopify', 'SHOPIFY')).toBe('Shopify')
    expect(darpanSystemDisplayLabel('DarSysNetSuite', 'NETSUITE')).toBe('NetSuite')
    expect(darpanSystemDisplayLabel('DarSysSapi', 'SAPI')).toBe('SAPI')
  })

  it('deduplicates legacy system options behind canonical values', () => {
    const options = deduplicateDarpanSystemOptions([
      { enumId: 'DarSysOms', enumCode: 'OMS', label: 'OMS', sequenceNum: 1 },
      { enumId: 'OMS', enumCode: 'HOTWAX', label: 'HotWax', sequenceNum: 1 },
      { enumId: 'DarSysShopify', enumCode: 'SHOPIFY', label: 'SHOPIFY', sequenceNum: 2 },
      { enumId: 'SHOPIFY', enumCode: 'SHOPIFY', label: 'Shopify', sequenceNum: 2 },
      { enumId: 'DarSysNetSuite', enumCode: 'NETSUITE', label: 'NETSUITE', sequenceNum: 3 },
    ])

    expect(options.map((option) => option.enumId)).toEqual(['OMS', 'SHOPIFY', 'NETSUITE'])
    expect(options.find((option) => option.enumId === 'OMS')?.label).toBe('HotWax')
    expect(options.find((option) => option.enumId === 'SHOPIFY')?.label).toBe('Shopify')
  })
})
