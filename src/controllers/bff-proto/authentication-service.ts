/* eslint-disable */
import Long from 'long'
import * as _m0 from 'protobufjs/minimal'

export const protobufPackage = ''

export interface GetChallengeRequest {
  address: string
}

export interface GetChallengeResponse {
  challengeToSign: string
  alreadyConnected: boolean
}

export interface SignedChallenge {
  challengeToSign: string
  authChainJson: string
}

export interface WelcomePeerInformation {
  peerId: string
}

function createBaseGetChallengeRequest(): GetChallengeRequest {
  return { address: '' }
}

export const GetChallengeRequest = {
  encode(message: GetChallengeRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.address !== '') {
      writer.uint32(10).string(message.address)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetChallengeRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseGetChallengeRequest()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): GetChallengeRequest {
    return {
      address: isSet(object.address) ? String(object.address) : ''
    }
  },

  toJSON(message: GetChallengeRequest): unknown {
    const obj: any = {}
    message.address !== undefined && (obj.address = message.address)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<GetChallengeRequest>, I>>(object: I): GetChallengeRequest {
    const message = createBaseGetChallengeRequest()
    message.address = object.address ?? ''
    return message
  }
}

function createBaseGetChallengeResponse(): GetChallengeResponse {
  return { challengeToSign: '', alreadyConnected: false }
}

export const GetChallengeResponse = {
  encode(message: GetChallengeResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.challengeToSign !== '') {
      writer.uint32(10).string(message.challengeToSign)
    }
    if (message.alreadyConnected === true) {
      writer.uint32(16).bool(message.alreadyConnected)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetChallengeResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseGetChallengeResponse()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.challengeToSign = reader.string()
          break
        case 2:
          message.alreadyConnected = reader.bool()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): GetChallengeResponse {
    return {
      challengeToSign: isSet(object.challengeToSign) ? String(object.challengeToSign) : '',
      alreadyConnected: isSet(object.alreadyConnected) ? Boolean(object.alreadyConnected) : false
    }
  },

  toJSON(message: GetChallengeResponse): unknown {
    const obj: any = {}
    message.challengeToSign !== undefined && (obj.challengeToSign = message.challengeToSign)
    message.alreadyConnected !== undefined && (obj.alreadyConnected = message.alreadyConnected)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<GetChallengeResponse>, I>>(object: I): GetChallengeResponse {
    const message = createBaseGetChallengeResponse()
    message.challengeToSign = object.challengeToSign ?? ''
    message.alreadyConnected = object.alreadyConnected ?? false
    return message
  }
}

function createBaseSignedChallenge(): SignedChallenge {
  return { challengeToSign: '', authChainJson: '' }
}

export const SignedChallenge = {
  encode(message: SignedChallenge, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.challengeToSign !== '') {
      writer.uint32(10).string(message.challengeToSign)
    }
    if (message.authChainJson !== '') {
      writer.uint32(18).string(message.authChainJson)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SignedChallenge {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseSignedChallenge()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.challengeToSign = reader.string()
          break
        case 2:
          message.authChainJson = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): SignedChallenge {
    return {
      challengeToSign: isSet(object.challengeToSign) ? String(object.challengeToSign) : '',
      authChainJson: isSet(object.authChainJson) ? String(object.authChainJson) : ''
    }
  },

  toJSON(message: SignedChallenge): unknown {
    const obj: any = {}
    message.challengeToSign !== undefined && (obj.challengeToSign = message.challengeToSign)
    message.authChainJson !== undefined && (obj.authChainJson = message.authChainJson)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<SignedChallenge>, I>>(object: I): SignedChallenge {
    const message = createBaseSignedChallenge()
    message.challengeToSign = object.challengeToSign ?? ''
    message.authChainJson = object.authChainJson ?? ''
    return message
  }
}

function createBaseWelcomePeerInformation(): WelcomePeerInformation {
  return { peerId: '' }
}

export const WelcomePeerInformation = {
  encode(message: WelcomePeerInformation, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.peerId !== '') {
      writer.uint32(10).string(message.peerId)
    }
    return writer
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): WelcomePeerInformation {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseWelcomePeerInformation()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.peerId = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): WelcomePeerInformation {
    return {
      peerId: isSet(object.peerId) ? String(object.peerId) : ''
    }
  },

  toJSON(message: WelcomePeerInformation): unknown {
    const obj: any = {}
    message.peerId !== undefined && (obj.peerId = message.peerId)
    return obj
  },

  fromPartial<I extends Exact<DeepPartial<WelcomePeerInformation>, I>>(object: I): WelcomePeerInformation {
    const message = createBaseWelcomePeerInformation()
    message.peerId = object.peerId ?? ''
    return message
  }
}

export type BffAuthenticationServiceDefinition = typeof BffAuthenticationServiceDefinition
export const BffAuthenticationServiceDefinition = {
  name: 'BffAuthenticationService',
  fullName: 'BffAuthenticationService',
  methods: {
    getChallenge: {
      name: 'GetChallenge',
      requestType: GetChallengeRequest,
      requestStream: false,
      responseType: GetChallengeResponse,
      responseStream: false,
      options: {}
    },
    authenticate: {
      name: 'Authenticate',
      requestType: SignedChallenge,
      requestStream: false,
      responseType: WelcomePeerInformation,
      responseStream: false,
      options: {}
    }
  }
} as const

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
