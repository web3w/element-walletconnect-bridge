import { ISocketMessage, ISocketSub, IWebSocket, WebSocketData,Logger } from './types'
import { pushNotification } from './notification'
import { setSub, getSub, setPub, getPub } from './keystore'

async function socketSend (socket: IWebSocket, socketMessage: ISocketMessage , logger: Logger) {
  if (socket.readyState === 1) {
    const message = JSON.stringify(socketMessage)
    socket.send(message)
    console.log('socket.send',message)
    // logger.info({ type: 'outgoing', message })
  } else {
    // 保存到 Redis中
    await setPub(socketMessage)
  }
}

// 消费 public 信息
async function SubController (
  socket: IWebSocket,
  socketMessage: ISocketMessage,
  logger: Logger
) {
  const topic = socketMessage.topic

  const subscriber = { topic, socket }

  await setSub(subscriber)

  // 从redis 中查找对应的 topic 并且删除
  const pending = await getPub(topic)

  // 如果 reids 中有对应的 topic  则发送topic
  if (pending && pending.length) {
    await Promise.all(
      pending.map((pendingMessage: ISocketMessage) =>
        socketSend(socket, pendingMessage, logger)
      )
    )
  }
}

// 向订阅的 dApp 和 wallet 的 subscriber 推送消息 内存中
async function PubController (socketMessage: ISocketMessage, logger: Logger) {
  // 通过wallet 扫码获取
  const subscribers = await getSub(socketMessage.topic)

  // 沉默的
  if (!socketMessage.silent) {
    // 不是沉默的。。
    await pushNotification(socketMessage.topic)
  }

  // 是否有订阅
  if (subscribers.length) {
    await Promise.all(
      subscribers.map((subscriber: ISocketSub) =>
        // 如果有订阅者.. 发送消息
        socketSend(subscriber.socket, socketMessage, logger)
      )
    )
  } else {
    // 没有就增加到订阅中
    await setPub(socketMessage)
  }
}

export default async (socket: IWebSocket, data: WebSocketData, logger: Logger) => {
  const message: string = String(data)

  if (!message || !message.trim()) {
    return
  }

  // console.log({ type: 'incoming', message })
  // logger.info({ type: 'incoming', message })

  try {
    let socketMessage: ISocketMessage | null = null

    try {
      socketMessage = JSON.parse(message)
    } catch (e) {
      // do nothing
    }

    if (!socketMessage) {
      return
    }

    switch (socketMessage.type) {
      case 'sub':
        await SubController(socket, socketMessage, logger)
        break
      case 'pub':
        await PubController(socketMessage, logger)
        break
      default:
        break
    }
  } catch (e) {
    console.error(e)
  }
}
