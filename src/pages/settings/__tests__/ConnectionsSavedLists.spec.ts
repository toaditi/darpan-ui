import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const route = vi.hoisted(() => ({
  query: {},
}))

const listSftpServers = vi.hoisted(() => vi.fn())
const saveSftpServer = vi.hoisted(() => vi.fn())
const listNsAuthConfigs = vi.hoisted(() => vi.fn())
const saveNsAuthConfig = vi.hoisted(() => vi.fn())
const listNsRestletConfigs = vi.hoisted(() => vi.fn())
const saveNsRestletConfig = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => route,
}))

vi.mock('../../../lib/api/facade', () => ({
  settingsFacade: {
    listSftpServers,
    saveSftpServer,
    listNsAuthConfigs,
    saveNsAuthConfig,
    listNsRestletConfigs,
    saveNsRestletConfig,
  },
}))

import NetSuiteAuthPage from '../NetSuiteAuthPage.vue'
import NetSuiteEndpointsPage from '../NetSuiteEndpointsPage.vue'
import SftpServersPage from '../SftpServersPage.vue'

describe('connections saved-name lists', () => {
  beforeEach(() => {
    route.query = {}

    listSftpServers.mockReset()
    saveSftpServer.mockReset()
    listNsAuthConfigs.mockReset()
    saveNsAuthConfig.mockReset()
    listNsRestletConfigs.mockReset()
    saveNsRestletConfig.mockReset()
  })

  it('renders SFTP saved records as name-only tiles that can be reopened for edit', async () => {
    listSftpServers.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      servers: [
        {
          sftpServerId: 'sftp-primary',
          description: 'Primary SFTP',
          host: 'sftp.example.com',
          port: 22,
          username: 'etl-user',
          hasPassword: true,
          hasPrivateKey: false,
        },
      ],
      pagination: { pageIndex: 0, pageSize: 10, totalCount: 1, pageCount: 1 },
    })

    const wrapper = mount(SftpServersPage)
    await flushPromises()

    expect(wrapper.find('.sparse-table').exists()).toBe(false)
    expect(wrapper.findAll('.settings-record-tile')).toHaveLength(1)
    const tile = wrapper.get('.settings-record-tile')
    expect(tile.text()).toBe('Primary SFTP')

    await tile.trigger('click')
    await flushPromises()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('sftp-primary')
  })

  it('renders NetSuite auth configs as name-only tiles that can be reopened for edit', async () => {
    listNsAuthConfigs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authConfigs: [
        {
          nsAuthConfigId: 'auth-primary',
          description: 'Primary Auth',
          authType: 'BASIC',
          username: 'service-user',
          isActive: 'Y',
          hasPassword: true,
          hasApiToken: false,
          hasPrivateKeyPem: false,
        },
      ],
      pagination: { pageIndex: 0, pageSize: 10, totalCount: 1, pageCount: 1 },
    })

    const wrapper = mount(NetSuiteAuthPage)
    await flushPromises()

    expect(wrapper.find('.sparse-table').exists()).toBe(false)
    expect(wrapper.findAll('.settings-record-tile')).toHaveLength(1)
    const tile = wrapper.get('.settings-record-tile')
    expect(tile.text()).toBe('Primary Auth')

    await tile.trigger('click')
    await flushPromises()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('auth-primary')
  })

  it('renders NetSuite endpoint configs as name-only tiles that can be reopened for edit', async () => {
    listNsAuthConfigs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authConfigs: [
        {
          nsAuthConfigId: 'auth-primary',
          description: 'Primary Auth',
          authType: 'BASIC',
          username: 'service-user',
          isActive: 'Y',
          hasPassword: true,
          hasApiToken: false,
          hasPrivateKeyPem: false,
        },
      ],
      pagination: { pageIndex: 0, pageSize: 200, totalCount: 1, pageCount: 1 },
    })
    listNsRestletConfigs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      restletConfigs: [
        {
          nsRestletConfigId: 'endpoint-primary',
          description: 'Invoice Export',
          endpointUrl: 'https://netsuite.example.com/restlet',
          httpMethod: 'POST',
          nsAuthConfigId: 'auth-primary',
          authType: 'BASIC',
          connectTimeoutSeconds: 30,
          readTimeoutSeconds: 60,
          isActive: 'Y',
        },
      ],
      pagination: { pageIndex: 0, pageSize: 10, totalCount: 1, pageCount: 1 },
    })

    const wrapper = mount(NetSuiteEndpointsPage)
    await flushPromises()

    expect(wrapper.find('.sparse-table').exists()).toBe(false)
    expect(wrapper.findAll('.settings-record-tile')).toHaveLength(1)
    const tile = wrapper.get('.settings-record-tile')
    expect(tile.text()).toBe('Invoice Export')

    await tile.trigger('click')
    await flushPromises()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('endpoint-primary')
  })
})
