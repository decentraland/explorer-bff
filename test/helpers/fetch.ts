import { IFetchComponent } from '@well-known-components/http-server'
import * as node_fetch from 'node-fetch'

export type FetchTestResponse = {
  status: number
  body: Record<string, string>
}

export function createTestFetchComponent(handler: (url: string) => FetchTestResponse): IFetchComponent {
  const fetch: IFetchComponent = {
    async fetch(info: node_fetch.RequestInfo, _?: node_fetch.RequestInit): Promise<node_fetch.Response> {
      const url = info.toString()
      const { body, status } = handler(url)
      const response = new node_fetch.Response(JSON.stringify(body), {
        status,
        url
      })
      return response
    }
  }

  return fetch
}
