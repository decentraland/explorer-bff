import { createLogComponent } from '@well-known-components/logger'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { aboutHandler } from '../../src/controllers/handlers/about-handler'
import { HealthStatus } from '../../src/ports/status'
import { createTestMetricsComponent } from '@well-known-components/metrics'
import { metricDeclarations } from '../../src/metrics'

describe('about-controller-unit', () => {
  const time = Date.now()

  const lambdasStatus = {
    time,
    version: 'lambdas-1',
    commitHash: 'lambdas-hash'
  }

  const contentStatus = {
    time,
    version: 'content-1',
    commitHash: 'content-hash'
  }

  const lighthouseStatus = {
    time,
    version: 'lighthouse-1',
    commitHash: 'lighthouse-hash',
    realmName: 'lighthouse-test',
    usersCount: 0
  }

  const metrics = createTestMetricsComponent(metricDeclarations)

  describe('with comms v2 layout', () => {
    const testAbout = async (lambdasHealth: HealthStatus) => {
      const config = {
        COMMS_PROTOCOL: 'v2',
        LAMBDAS_URL: 'http://lambdas',
        COMMIT_HASH: 'bff-hash'
      }

      const status = {
        getLambdasHealth: () => Promise.resolve(lambdasHealth),
        getLambdasStatus: () => Promise.resolve(lambdasStatus),
        getContentStatus: () => Promise.resolve(contentStatus),
        getLighthouseStatus: () => Promise.resolve(lighthouseStatus)
      }

      const realm = {
        getName: (_?: string) => Promise.resolve('test')
      }

      const rpcSessions = {
        sessions: new Map()
      }

      const response = await aboutHandler({
        url: new URL('https://bff/about'),
        components: {
          serviceDiscovery: {
            getClusterStatus: () => Promise.resolve({}),
            stop: () => Promise.resolve()
          },
          config: createConfigComponent(config),
          status,
          realm,
          rpcSessions,
          metrics
        }
      })

      const { body } = response

      expect(body.configurations.realmName).toEqual('test')
      expect(body.content.commitHash).toEqual(contentStatus.commitHash)
      expect(body.content.version).toEqual(contentStatus.version)

      expect(body.lambdas.commitHash).toEqual(lambdasStatus.commitHash)
      expect(body.lambdas.version).toEqual(lambdasStatus.version)

      expect(body.comms.commitHash).toEqual(lighthouseStatus.commitHash)
      expect(body.comms.version).toEqual(lighthouseStatus.version)

      expect(body.bff.healthy).toEqual(true)
      expect(body.bff.commitHash).toEqual('bff-hash')
      expect(body.bff.userCount).toEqual(0)

      return response
    }

    it('services are healthy', async () => {
      const { status, body } = await testAbout({
        lambdas: true,
        content: true,
        comms: true
      })

      expect(status).toEqual(200)
      expect(body.healthy).toEqual(true)
      expect(body.content.healthy).toEqual(true)
      expect(body.lambdas.healthy).toEqual(true)
      expect(body.comms.protocol).toEqual('v2')
      expect(body.comms.healthy).toEqual(true)
    })

    it('content is not healthy', async () => {
      const { status, body } = await testAbout({
        lambdas: true,
        content: false,
        comms: true
      })

      expect(status).toEqual(503)
      expect(body.healthy).toEqual(false)
      expect(body.content.healthy).toEqual(false)
      expect(body.lambdas.healthy).toEqual(true)
      expect(body.comms.protocol).toEqual('v2')
      expect(body.comms.healthy).toEqual(true)
    })
  })

  describe('with comms v3 layout', () => {
    const testAbout = async (lambdasHealth: HealthStatus, archipelagoStatus: any) => {
      const config = {
        COMMS_PROTOCOL: 'v3',
        LAMBDAS_URL: 'http://lambdas',
        COMMIT_HASH: 'bff-hash'
      }

      const status = {
        getLambdasHealth: () => Promise.resolve(lambdasHealth),
        getLambdasStatus: () => Promise.resolve(lambdasStatus),
        getContentStatus: () => Promise.resolve(contentStatus),
        getLighthouseStatus: () => Promise.resolve(undefined)
      }

      const realm = {
        getName: (_?: string) => Promise.resolve('test')
      }

      const rpcSessions = {
        sessions: new Map()
      }

      const response = await aboutHandler({
        url: new URL('https://bff/about'),
        components: {
          serviceDiscovery: {
            getClusterStatus: () => Promise.resolve({ archipelago: archipelagoStatus }),
            stop: () => Promise.resolve()
          },
          config: createConfigComponent(config),
          status,
          realm,
          rpcSessions,
          metrics
        }
      })

      const { body } = response

      expect(body.configurations.realmName).toEqual('test')
      expect(body.content.commitHash).toEqual(contentStatus.commitHash)
      expect(body.content.version).toEqual(contentStatus.version)

      expect(body.lambdas.commitHash).toEqual(lambdasStatus.commitHash)
      expect(body.lambdas.version).toEqual(lambdasStatus.version)

      expect(body.bff.healthy).toEqual(true)
      expect(body.bff.commitHash).toEqual('bff-hash')
      expect(body.bff.userCount).toEqual(0)

      return response
    }

    it('services are healthy', async () => {
      const { status, body } = await testAbout(
        {
          lambdas: true,
          content: true,
          comms: false
        },
        {}
      )

      expect(status).toEqual(200)
      expect(body.healthy).toEqual(true)
      expect(body.content.healthy).toEqual(true)
      expect(body.lambdas.healthy).toEqual(true)
      expect(body.comms.healthy).toEqual(true)
      expect(body.comms.protocol).toEqual('v3')
    })

    it('content is not healthy', async () => {
      const { status, body } = await testAbout(
        {
          lambdas: true,
          content: false,
          comms: false
        },
        {}
      )

      expect(status).toEqual(503)
      expect(body.healthy).toEqual(false)
      expect(body.content.healthy).toEqual(false)
      expect(body.lambdas.healthy).toEqual(true)
      expect(body.comms.healthy).toEqual(true)
      expect(body.comms.protocol).toEqual('v3')
    })

    it('comms is not healthy', async () => {
      const { status, body } = await testAbout(
        {
          lambdas: true,
          content: true,
          comms: true
        },
        undefined
      )

      expect(status).toEqual(503)
      expect(body.healthy).toEqual(false)
      expect(body.content.healthy).toEqual(true)
      expect(body.lambdas.healthy).toEqual(true)
      expect(body.comms.healthy).toEqual(false)
      expect(body.comms.protocol).toEqual('v3')
    })
  })
})
