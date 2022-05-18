/* eslint-disable */
import Long from 'long'
import * as _m0 from 'protobufjs/minimal'

export const protobufPackage = ''

export interface RoomMessage {
  payload: Uint8Array
  room: string
  sender: string
}

export interface PublishRoomMessage {
  payload: Uint8Array
  room: string
}

export interface RoomSubscriptionMessage {
  room: string
}

export interface EmptyResult {
  ok: boolean
}

function createBaseRoomMessage(): RoomMessage {
  return { payload: new Uint8Array(), room: '', sender: '' }
}

export const RoomMessage = {
  encode(message: RoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.payload.length !== 0) {
      writer.uint32(10).bytes(message.payload)
    }
    if (message.room !== '') {
      writer.uint32(18).string(message.room)
    }
    if (message.sender !== '') {
      writer.uint32(26).string(message.sender)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RoomMessage {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseRoomMessage()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.payload = reader.bytes()
          break
        case 2:
          message.room = reader.string()
          break
        case 3:
          message.sender = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): RoomMessage {
    return {
      payload: isSet(object.payload) ? bytesFromBase64(object.payload) : new Uint8Array(),
      room: isSet(object.room) ? String(object.room) : '',
      sender: isSet(object.sender) ? String(object.sender) : ''
    }
  },

  toJSON(message: RoomMessage): unknown {
    const obj: any = {}
    message.payload !== undefined &&
      (obj.payload = base64FromBytes(message.payload !== undefined ? message.payload : new Uint8Array()))
    message.room !== undefined && (obj.room = message.room)
    message.sender !== undefined && (obj.sender = message.sender)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<RoomMessage>, I>>(object: I): RoomMessage {
    const message = createBaseRoomMessage()
    message.payload = object.payload ?? new Uint8Array()
    message.room = object.room ?? ''
    message.sender = object.sender ?? ''
    return message
  }
}

function createBasePublishRoomMessage(): PublishRoomMessage {
  return { payload: new Uint8Array(), room: '' }
}

export const PublishRoomMessage = {
  encode(message: PublishRoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.payload.length !== 0) {
      writer.uint32(10).bytes(message.payload)
    }
    if (message.room !== '') {
      writer.uint32(18).string(message.room)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PublishRoomMessage {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBasePublishRoomMessage()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.payload = reader.bytes()
          break
        case 2:
          message.room = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): PublishRoomMessage {
    return {
      payload: isSet(object.payload) ? bytesFromBase64(object.payload) : new Uint8Array(),
      room: isSet(object.room) ? String(object.room) : ''
    }
  },

  toJSON(message: PublishRoomMessage): unknown {
    const obj: any = {}
    message.payload !== undefined &&
      (obj.payload = base64FromBytes(message.payload !== undefined ? message.payload : new Uint8Array()))
    message.room !== undefined && (obj.room = message.room)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<PublishRoomMessage>, I>>(object: I): PublishRoomMessage {
    const message = createBasePublishRoomMessage()
    message.payload = object.payload ?? new Uint8Array()
    message.room = object.room ?? ''
    return message
  }
}

function createBaseRoomSubscriptionMessage(): RoomSubscriptionMessage {
  return { room: '' }
}

export const RoomSubscriptionMessage = {
  encode(message: RoomSubscriptionMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.room !== '') {
      writer.uint32(10).string(message.room)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RoomSubscriptionMessage {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseRoomSubscriptionMessage()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.room = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): RoomSubscriptionMessage {
    return {
      room: isSet(object.room) ? String(object.room) : ''
    }
  },

  toJSON(message: RoomSubscriptionMessage): unknown {
    const obj: any = {}
    message.room !== undefined && (obj.room = message.room)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<RoomSubscriptionMessage>, I>>(object: I): RoomSubscriptionMessage {
    const message = createBaseRoomSubscriptionMessage()
    message.room = object.room ?? ''
    return message
  }
}

function createBaseEmptyResult(): EmptyResult {
  return { ok: false }
}

export const EmptyResult = {
  encode(message: EmptyResult, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.ok === true) {
      writer.uint32(8).bool(message.ok)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EmptyResult {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseEmptyResult()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.ok = reader.bool()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): EmptyResult {
    return {
      ok: isSet(object.ok) ? Boolean(object.ok) : false
    }
  },

  toJSON(message: EmptyResult): unknown {
    const obj: any = {}
    message.ok !== undefined && (obj.ok = message.ok)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<EmptyResult>, I>>(object: I): EmptyResult {
    const message = createBaseEmptyResult()
    message.ok = object.ok ?? false
    return message
  }
}

export type RoomServiceDefinition = typeof RoomServiceDefinition
export const RoomServiceDefinition = {
  name: 'RoomService',
  fullName: 'RoomService',
  methods: {
    getAllMessages: {
      name: 'GetAllMessages',
      requestType: RoomSubscriptionMessage,
      requestStream: false,
      responseType: RoomMessage,
      responseStream: true,
      options: {}
    },
    publishMessage: {
      name: 'PublishMessage',
      requestType: PublishRoomMessage,
      requestStream: false,
      responseType: EmptyResult,
      responseStream: false,
      options: {}
    }
  }
} as const

declare var self: any | undefined
declare var window: any | undefined
declare var global: any | undefined
var globalThis: any = (() => {
  if (typeof globalThis !== 'undefined') return globalThis
  if (typeof self !== 'undefined') return self
  if (typeof window !== 'undefined') return window
  if (typeof global !== 'undefined') return global
  throw 'Unable to locate global object'
})()

const atob: (b64: string) => string =
  globalThis.atob || ((b64) => globalThis.Buffer.from(b64, 'base64').toString('binary'))
function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; ++i) {
    arr[i] = bin.charCodeAt(i)
  }
  return arr
}

const btoa: (bin: string) => string =
  globalThis.btoa || ((bin) => globalThis.Buffer.from(bin, 'binary').toString('base64'))
function base64FromBytes(arr: Uint8Array): string {
  const bin: string[] = []
  arr.forEach((byte) => {
    bin.push(String.fromCharCode(byte))
  })
  return btoa(bin.join(''))
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>

type KeysOfUnion<T> = T extends T ? keyof T : never
export type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & Record<Exclude<keyof I, KeysOfUnion<P>>, never>

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any
  _m0.configure()
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined
}
