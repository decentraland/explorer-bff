interface TextEncoder {
  encode(input?: string): Uint8Array
}
interface TextDecoder {
  decode(input?: Uint8Array): string
}
interface WebSocket {
  CONNECTING: number;
  OPEN: number;
  CLOSING: number;
  CLOSED: number;
  readyState: number;
  close(code?: number, data?: string): void;
  send(data: any, cb?: (err: Error) => void): void;
  send(data: any, options: any, cb?: (err: Error) => void): void;
  terminate?(): void;
  addEventListener(type: string, listener: (ev: any) => any, options?: any): void;
}
type ResponseInit = string | object