import { createIdentity } from 'eth-crypto'
import { Authenticator } from '@dcl/crypto'
import { sha512 } from 'ethereum-cryptography/sha512'
import { utf8ToBytes } from 'ethereum-cryptography/utils'

export function createEphemeralIdentity(entropy?: string) {
  const theRealEntropy = entropy
    ? Buffer.concat([sha512(utf8ToBytes(entropy)), sha512(utf8ToBytes(entropy))])
    : undefined
  const theRealEntropyEphemeral = entropy
    ? Buffer.concat([sha512(utf8ToBytes(entropy + 'ephemeral')), sha512(utf8ToBytes(entropy))])
    : undefined
  const realIdentity = createIdentity(theRealEntropy)
  const ephemeral = createIdentity(theRealEntropyEphemeral)

  return {
    address: realIdentity.address,
    async sign(message: string) {
      return Authenticator.createAuthChain(realIdentity, ephemeral, 10, message)
    }
  }
}
