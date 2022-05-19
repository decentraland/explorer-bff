export function delay(ms: number) {
  return new Promise((ret) => setTimeout(ret, ms))
}
