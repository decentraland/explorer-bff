import { HandlerContextWithPath } from "../../types"

// handlers arguments only type what they need, to make unit testing easier
export async function statusHandler(_context: Pick<HandlerContextWithPath<"metrics", "/status">, "url" | "components">) {
  return {
    body: {},
  }
}
