/* eslint-disable */
import Long from 'long'
import * as _m0 from 'protobufjs/minimal'

export const protobufPackage = ''

export interface TopicSubscriptionResultElem {
  payload: Uint8Array
  sender: string
}

export interface PublishToTopicRequest {
  topic: string
  payload: Uint8Array
}

export interface TopicSubscriptionRequest {
  topic: string
}

export interface PublishToTopicResult {}

function createBaseTopicSubscriptionResultElem(): TopicSubscriptionResultElem {
  return { payload: new Uint8Array(), sender: '' }
}

export const TopicSubscriptionResultElem = {
  encode(message: TopicSubscriptionResultElem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.payload.length !== 0) {
      writer.uint32(10).bytes(message.payload)
    }
    if (message.sender !== '') {
      writer.uint32(18).string(message.sender)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TopicSubscriptionResultElem {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseTopicSubscriptionResultElem()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.payload = reader.bytes()
          break
        case 2:
          message.sender = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): TopicSubscriptionResultElem {
    return {
      payload: isSet(object.payload) ? bytesFromBase64(object.payload) : new Uint8Array(),
      sender: isSet(object.sender) ? String(object.sender) : ''
    }
  },

  toJSON(message: TopicSubscriptionResultElem): unknown {
    const obj: any = {}
    message.payload !== undefined &&
      (obj.payload = base64FromBytes(message.payload !== undefined ? message.payload : new Uint8Array()))
    message.sender !== undefined && (obj.sender = message.sender)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<TopicSubscriptionResultElem>, I>>(object: I): TopicSubscriptionResultElem {
    const message = createBaseTopicSubscriptionResultElem()
    message.payload = object.payload ?? new Uint8Array()
    message.sender = object.sender ?? ''
    return message
  }
}

function createBasePublishToTopicRequest(): PublishToTopicRequest {
  return { topic: '', payload: new Uint8Array() }
}

export const PublishToTopicRequest = {
  encode(message: PublishToTopicRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.topic !== '') {
      writer.uint32(10).string(message.topic)
    }
    if (message.payload.length !== 0) {
      writer.uint32(18).bytes(message.payload)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PublishToTopicRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBasePublishToTopicRequest()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.topic = reader.string()
          break
        case 2:
          message.payload = reader.bytes()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): PublishToTopicRequest {
    return {
      topic: isSet(object.topic) ? String(object.topic) : '',
      payload: isSet(object.payload) ? bytesFromBase64(object.payload) : new Uint8Array()
    }
  },

  toJSON(message: PublishToTopicRequest): unknown {
    const obj: any = {}
    message.topic !== undefined && (obj.topic = message.topic)
    message.payload !== undefined &&
      (obj.payload = base64FromBytes(message.payload !== undefined ? message.payload : new Uint8Array()))
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<PublishToTopicRequest>, I>>(object: I): PublishToTopicRequest {
    const message = createBasePublishToTopicRequest()
    message.topic = object.topic ?? ''
    message.payload = object.payload ?? new Uint8Array()
    return message
  }
}

function createBaseTopicSubscriptionRequest(): TopicSubscriptionRequest {
  return { topic: '' }
}

export const TopicSubscriptionRequest = {
  encode(message: TopicSubscriptionRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.topic !== '') {
      writer.uint32(10).string(message.topic)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TopicSubscriptionRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseTopicSubscriptionRequest()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.topic = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): TopicSubscriptionRequest {
    return {
      topic: isSet(object.topic) ? String(object.topic) : ''
    }
  },

  toJSON(message: TopicSubscriptionRequest): unknown {
    const obj: any = {}
    message.topic !== undefined && (obj.topic = message.topic)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<TopicSubscriptionRequest>, I>>(object: I): TopicSubscriptionRequest {
    const message = createBaseTopicSubscriptionRequest()
    message.topic = object.topic ?? ''
    return message
  }
}

function createBasePublishToTopicResult(): PublishToTopicResult {
  return {}
}

export const PublishToTopicResult = {
  encode(_: PublishToTopicResult, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PublishToTopicResult {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBasePublishToTopicResult()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(_: any): PublishToTopicResult {
    return {}
  },

  toJSON(_: PublishToTopicResult): unknown {
    const obj: any = {}
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<PublishToTopicResult>, I>>(_: I): PublishToTopicResult {
    const message = createBasePublishToTopicResult()
    return message
  }
}

export type CommsServiceDefinition = typeof CommsServiceDefinition
export const CommsServiceDefinition = {
  name: 'CommsService',
  fullName: 'CommsService',
  methods: {
    /** subscribe to a topic, stream all the messages */
    subscribeToTopic: {
      name: 'SubscribeToTopic',
      requestType: TopicSubscriptionRequest,
      requestStream: false,
      responseType: TopicSubscriptionResultElem,
      responseStream: true,
      options: {}
    },
    /** send a message to a topic */
    publishToTopic: {
      name: 'PublishToTopic',
      requestType: PublishToTopicRequest,
      requestStream: false,
      responseType: PublishToTopicResult,
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
