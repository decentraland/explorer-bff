import { test } from '../components'
import { createAndAuthenticateIdentity, getModuleFuture, takeAsync } from '../helpers/rpc'
import { delay } from '../helpers/delay'
import { saltedPrefix, peerPrefix } from '../../src/controllers/rpc/comms'
import {
  PeerTopicSubscriptionResultElem,
  SystemTopicSubscriptionResultElem,
  TopicsServiceDefinition
} from '@dcl/protocol/out-js/decentraland/bff/topics_service.gen'

function saltSystemTopic(topic: string) {
  return `${saltedPrefix}${topic}`
}

function saltPeerTopic(peerId: string, topic: string) {
  return `${peerPrefix}${peerId}.${topic}`
}

test('rpc: topics service', function ({ components }) {
  const connection1 = createAndAuthenticateIdentity('connection1', components)
  const roomServiceFuture1 = getModuleFuture(connection1, TopicsServiceDefinition)

  it('emits a message and cuts the stream', async () => {
    const { nats } = components
    const sender = await roomServiceFuture1
    const topic = 'abc'
    const msg1 = new Uint8Array([1, 2, 3])

    async function fn() {
      for await (const msg of sender.systemSubscription({ topic })) {
        return msg
      }
    }

    const finished = fn()

    await delay(100)

    nats.publish(saltSystemTopic(topic), msg1)

    expect(await finished).toEqual({ payload: msg1, topic })

    await delay(100)
  })

  it('emiting a message makes the message arrive', async () => {
    const { nats } = components
    const sender = await roomServiceFuture1
    const topic = 'abcd'

    const stream = sender.systemSubscription({ topic })[Symbol.asyncIterator]()
    const finished = takeAsync<SystemTopicSubscriptionResultElem>(stream, 2)

    const msg1 = new Uint8Array([1, 2, 3])
    const msg2 = new Uint8Array([1])
    const msg3 = new Uint8Array([3, 3, 3])

    await delay(100)

    nats.publish(saltSystemTopic(topic), msg1)
    nats.publish(saltSystemTopic('another-topic'), msg2)
    nats.publish(saltSystemTopic(topic), msg3)

    expect(await finished).toEqual([
      { payload: msg1, topic },
      { payload: msg3, topic }
    ])
  })
})

test('rpc: topics service sanity peer message', function ({ components }) {
  const connection1 = createAndAuthenticateIdentity('connection1', components)
  const roomServiceFuture1 = getModuleFuture(connection1, TopicsServiceDefinition)

  it('emits a message and cuts the stream', async () => {
    const { nats } = components
    const sender = await roomServiceFuture1
    const fromPeerId = 'peer1'
    const topic = 'abc'
    const msg1 = new Uint8Array([1, 2, 3])

    async function fn() {
      for await (const msg of sender.peerSubscription({ topic })) {
        return msg
      }
    }

    const finished = fn()

    await delay(100)

    nats.publish(saltPeerTopic(fromPeerId, topic), msg1)

    expect(await finished).toEqual({ payload: msg1, topic, sender: fromPeerId })

    await delay(100)
  })

  it('emiting a message makes the message arrive', async () => {
    const { nats } = components
    const sender = await roomServiceFuture1
    const fromPeerId = 'peer1'
    const topic = 'abcd'

    const stream = sender.peerSubscription({ topic })[Symbol.asyncIterator]()
    const finished = takeAsync<PeerTopicSubscriptionResultElem>(stream, 2)

    const msg1 = new Uint8Array([1, 2, 3])
    const msg2 = new Uint8Array([1])
    const msg3 = new Uint8Array([3, 3, 3])

    await delay(100)

    nats.publish(saltPeerTopic(fromPeerId, topic), msg1)
    nats.publish(saltPeerTopic(fromPeerId, 'another-topic'), msg2)
    nats.publish(saltPeerTopic(fromPeerId, topic), msg3)

    expect(await finished).toEqual([
      { payload: msg1, topic, sender: fromPeerId },
      { payload: msg3, topic, sender: fromPeerId }
    ])
  })
})

test('rpc: RoomService integration', function ({ components, stubComponents }) {
  const connection1 = createAndAuthenticateIdentity('connection1', components)
  const roomServiceFuture1 = getModuleFuture(connection1, TopicsServiceDefinition)
  const connection2 = createAndAuthenticateIdentity('connection2', components)
  const roomServiceFuture2 = getModuleFuture(connection2, TopicsServiceDefinition)

  it('sends a message e2e', async () => {
    const sender = await roomServiceFuture1
    const receiver = await roomServiceFuture2
    const topic = 'abc'

    async function fn() {
      for await (const msg of receiver.peerSubscription({ topic })) {
        return msg
      }
    }

    const finished = fn()

    await delay(100)
    await sender.publishToTopic({ payload: new Uint8Array([1, 2, 3]), topic })

    expect(await finished).toEqual({
      topic,
      sender: connection1.identity.address.toLowerCase(),
      payload: new Uint8Array([1, 2, 3])
    })
  })
})
