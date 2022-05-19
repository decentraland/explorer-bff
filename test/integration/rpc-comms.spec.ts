import { test } from '../components'
import { createAndAuthenticateIdentity, getModuleFuture, takeAsync } from '../helpers/rpc'
import { delay } from '../helpers/delay'
import { CommsServiceDefinition, TopicSubscriptionResultElem } from '../../src/controllers/bff-proto/comms-service'
import { saltTopic } from '../../src/controllers/rpc/comms'

test('rpc: RoomService sanity integration receive message', function ({ components, stubComponents }) {
  const connection1 = createAndAuthenticateIdentity('connection1', components)
  const roomServiceFuture1 = getModuleFuture(connection1, CommsServiceDefinition)

  it('emits a message and cuts the stream', async () => {
    const { messageBroker } = components
    const sender = await roomServiceFuture1
    const topic = 'abc'
    const msg1 = new Uint8Array([1, 2, 3])

    async function fn() {
      for await (const msg of sender.subscribeToTopic({ topic })) {
        return msg
      }
    }

    const finished = fn()

    await delay(100)

    messageBroker.publish(saltTopic(topic), msg1)

    expect(await finished).toEqual({ payload: msg1, sender: '0x0', topic })

    await delay(100)
  })

  it('emiting a message makes the message arrive', async () => {
    const { messageBroker } = components
    const sender = await roomServiceFuture1
    const topic = 'abc'

    const stream = sender.subscribeToTopic({ topic })[Symbol.asyncIterator]()
    const finished = takeAsync<TopicSubscriptionResultElem>(stream, 2)

    const msg1 = new Uint8Array([1, 2, 3])
    const msg2 = new Uint8Array([1])
    const msg3 = new Uint8Array([3, 3, 3])

    await delay(100)

    messageBroker.publish(saltTopic(topic), msg1)
    messageBroker.publish(saltTopic('another-topic'), msg2)
    messageBroker.publish(saltTopic(topic), msg3)

    expect(await finished).toEqual([
      { payload: msg1, sender: '0x0', topic },
      { payload: msg3, sender: '0x0', topic }
    ])
  })
})

test('rpc: RoomService integration', function ({ components, stubComponents }) {
  const connection1 = createAndAuthenticateIdentity('connection1', components)
  const roomServiceFuture1 = getModuleFuture(connection1, CommsServiceDefinition)
  const connection2 = createAndAuthenticateIdentity('connection2', components)
  const roomServiceFuture2 = getModuleFuture(connection2, CommsServiceDefinition)

  it('sends a message e2e', async () => {
    const sender = await roomServiceFuture1
    const receiver = await roomServiceFuture2
    const topic = 'abc'

    async function fn() {
      for await (const msg of receiver.subscribeToTopic({ topic })) {
        return msg
      }
    }

    const finished = fn()

    await delay(100)
    await sender.publishToTopic({ payload: new Uint8Array([1, 2, 3]), topic })

    expect(await finished).toEqual({
      topic,
      sender: '0x0', // FIXME
      payload: new Uint8Array([1, 2, 3])
    })
  })
})
