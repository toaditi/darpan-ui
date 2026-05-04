import { describe, expect, it } from 'vitest'
import { OMS_ORDERS_ENDPOINT_DOC, OMS_SWAGGER_BASE_URL, OMS_SWAGGER_SOURCE } from '../omsSwagger'

describe('HotWax Swagger metadata', () => {
  it('captures the dev HotWax orders endpoint used for setup hints', () => {
    expect(OMS_SWAGGER_BASE_URL).toBe('https://dev-maarg.hotwax.io')
    expect(OMS_SWAGGER_SOURCE.title).toBe('HotWax API')
    expect(OMS_SWAGGER_SOURCE.basePath).toBe('/rest/s1/oms/orders')
    expect(OMS_ORDERS_ENDPOINT_DOC).toMatchObject({
      label: 'Orders API',
      method: 'GET',
      path: '/rest/s1/oms/orders',
      responseSchema: 'OrderHeader.default[]',
    })
    expect(OMS_ORDERS_ENDPOINT_DOC.authLabels).toEqual(['Basic', 'API key header'])
    expect(OMS_ORDERS_ENDPOINT_DOC.queryParameters).toContain('orderDate')
  })
})
