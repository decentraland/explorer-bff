import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { RoomMessage, RpcContext } from '../../types'
import { RoomServiceDefinition } from './room-service'
import { pushableChannel } from '@dcl/rpc/dist/push-channel'

export const roomsModule: RpcServerModule<RoomServiceDefinition, RpcContext> = {
  async publishMessage(topicMessage, context) {
    const { roomsMessages } = context.components

    roomsMessages.emit(topicMessage.room, {
      payload: topicMessage.payload,
      room: topicMessage.room,
      sender: context.peer!.address
    })

    return {
      ok: true
    }
  },
  async *getAllMessages(subscription, context) {
    const { roomsMessages } = context.components
    // TODO(mendez): I'm sure there is a better way to do this
    const channel = pushableChannel<RoomMessage>(function deferCloseChannel() {
      roomsMessages.off(subscription.room, channel.push)
    })

    // subscribe to room message
    roomsMessages.on(subscription.room, channel.push)

    try {
      // forward all messages
      for await (const message of channel) {
        yield message
      }
    } finally {
      // then close the channel
      channel.close()
    }
  }
}
