// package: protocol
// file: nats.proto

import * as jspb from "google-protobuf";

export class HeartbeatMessage extends jspb.Message {
  clearPositionList(): void;
  getPositionList(): Array<number>;
  setPositionList(value: Array<number>): void;
  addPosition(value: number, index?: number): number;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HeartbeatMessage.AsObject;
  static toObject(includeInstance: boolean, msg: HeartbeatMessage): HeartbeatMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HeartbeatMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HeartbeatMessage;
  static deserializeBinaryFromReader(message: HeartbeatMessage, reader: jspb.BinaryReader): HeartbeatMessage;
}

export namespace HeartbeatMessage {
  export type AsObject = {
    positionList: Array<number>,
  }
}

export class IslandChangedMessage extends jspb.Message {
  getIslandId(): string;
  setIslandId(value: string): void;

  getConnStr(): string;
  setConnStr(value: string): void;

  hasFromIslandId(): boolean;
  clearFromIslandId(): void;
  getFromIslandId(): string;
  setFromIslandId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): IslandChangedMessage.AsObject;
  static toObject(includeInstance: boolean, msg: IslandChangedMessage): IslandChangedMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: IslandChangedMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): IslandChangedMessage;
  static deserializeBinaryFromReader(message: IslandChangedMessage, reader: jspb.BinaryReader): IslandChangedMessage;
}

export namespace IslandChangedMessage {
  export type AsObject = {
    islandId: string,
    connStr: string,
    fromIslandId: string,
  }
}

export class IslandLeftMessage extends jspb.Message {
  getIslandId(): string;
  setIslandId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): IslandLeftMessage.AsObject;
  static toObject(includeInstance: boolean, msg: IslandLeftMessage): IslandLeftMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: IslandLeftMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): IslandLeftMessage;
  static deserializeBinaryFromReader(message: IslandLeftMessage, reader: jspb.BinaryReader): IslandLeftMessage;
}

export namespace IslandLeftMessage {
  export type AsObject = {
    islandId: string,
  }
}

