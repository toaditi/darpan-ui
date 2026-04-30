import { describe, expect, it } from 'vitest'

import { parseCsvHeaderRow } from '../csv'

describe('parseCsvHeaderRow', () => {
  it('returns the first CSV row as header names', () => {
    expect(parseCsvHeaderRow('order_id,sku,quantity\n1001,ABC,2\n')).toEqual(['order_id', 'sku', 'quantity'])
  })

  it('supports quoted headers containing commas', () => {
    expect(parseCsvHeaderRow('"order,id","sku","qty"\n1001,ABC,2\n')).toEqual(['order,id', 'sku', 'qty'])
  })

  it('strips a UTF-8 BOM and surrounding whitespace from header values', () => {
    expect(parseCsvHeaderRow('\uFEFF order_id , sku \r\n1001,ABC\r\n')).toEqual(['order_id', 'sku'])
  })

  it('supports escaped quotes inside quoted headers', () => {
    expect(parseCsvHeaderRow('"order ""external"" id",sku\n1001,ABC\n')).toEqual(['order "external" id', 'sku'])
  })
})
