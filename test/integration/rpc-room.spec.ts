import { test } from '../components'
import { createAndAuthenticateIdentity, getModuleFuture, takeAsync } from '../helpers/rpc'
import { RoomMessage, RoomServiceDefinition } from '../../src/controllers/bff-proto/room-service'
import Sinon from 'sinon'
import { RoomMessage as InternalRoomMessage } from '../../src/types'
import { normalizeAddress } from '../../src/logic/address'
import { delay } from '../helpers/delay'

test('rpc: RoomService sanity integration send message', function ({ components, stubComponents }) {
  const connection1 = createAndAuthenticateIdentity('connection1', components)
  const roomServiceFuture1 = getModuleFuture(connection1, RoomServiceDefinition)

  it('sending a message triggers emit in roomsMessages', async () => {
    const { roomsMessages } = stubComponents
    const sender = await roomServiceFuture1
    const roomName = 'abc'
    await sender.publishMessage({ payload: new Uint8Array([1, 2, 3]), room: roomName }, {})
    Sinon.assert.calledWith(roomsMessages.emit as any, roomName, {
      payload: new Uint8Array([1, 2, 3]),
      room: roomName,
      sender: normalizeAddress(connection1.identity.address)
    } as InternalRoomMessage)
  })
})

test('rpc: RoomService sanity integration receive message', function ({ components, stubComponents }) {
  const connection1 = createAndAuthenticateIdentity('connection1', components)
  const roomServiceFuture1 = getModuleFuture(connection1, RoomServiceDefinition)

  it('emits a message and cuts the stream', async () => {
    const { roomsMessages } = components
    const spyOff = Sinon.spy(roomsMessages, 'off')
    const sender = await roomServiceFuture1
    const roomName = 'abc'
    const msg1: InternalRoomMessage = {
      payload: new Uint8Array([1, 2, 3]),
      room: roomName,
      sender: normalizeAddress(connection1.identity.address)
    }

    async function fn() {
      for await (const msg of sender.getAllMessages({ room: roomName }, {})) {
        return msg
      }
    }

    const finished = fn()

    await delay(100)

    roomsMessages.emit(msg1.room, msg1)
    expect(await finished).toEqual(msg1)

    await delay(100)

    // the .off should have been called after closing the stream
    Sinon.assert.called(spyOff)
  })

  it('emiting a message makes the message arrive', async () => {
    const { roomsMessages } = components
    const sender = await roomServiceFuture1
    const roomName = 'abc'

    const stream = sender.getAllMessages({ room: roomName }, {})[Symbol.asyncIterator]()
    const finished = takeAsync<RoomMessage>(stream, 2)

    const msg1: InternalRoomMessage = {
      payload: new Uint8Array([1, 2, 3]),
      room: roomName,
      sender: normalizeAddress(connection1.identity.address)
    }
    const msg2: InternalRoomMessage = {
      payload: new Uint8Array([1]),
      room: 'asdasdasdasd',
      sender: '0x0'
    }
    const msg3: InternalRoomMessage = {
      payload: new Uint8Array([3, 3, 3]),
      room: roomName,
      sender: normalizeAddress(connection1.identity.address)
    }

    await delay(100)

    roomsMessages.emit(msg1.room, msg1)
    roomsMessages.emit(msg2.room, msg2)
    roomsMessages.emit(msg3.room, msg3)

    expect(await finished).toEqual([msg1, msg3])
  })
})

test('rpc: RoomService integration', function ({ components, stubComponents }) {
  const connection1 = createAndAuthenticateIdentity('connection1', components)
  const roomServiceFuture1 = getModuleFuture(connection1, RoomServiceDefinition)
  const connection2 = createAndAuthenticateIdentity('connection2', components)
  const roomServiceFuture2 = getModuleFuture(connection2, RoomServiceDefinition)

  it('sends a message e2e', async () => {
    const sender = await roomServiceFuture1
    const receiver = await roomServiceFuture2
    const roomName = 'abc'

    async function fn() {
      for await (const msg of receiver.getAllMessages({ room: roomName }, {})) {
        return msg
      }
    }

    const finished = fn()

    await delay(100)
    await sender.publishMessage({ payload: new Uint8Array([1, 2, 3]), room: roomName }, {})

    expect(await finished).toEqual({
      room: roomName,
      sender: normalizeAddress(connection1.identity.address),
      payload: new Uint8Array([1, 2, 3])
    })
  })
})
