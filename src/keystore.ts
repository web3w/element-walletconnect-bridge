import redis from 'redis'
import { ISocketMessage, ISocketSub, INotification } from './types'
import bluebird from 'bluebird'
import config from './config'

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

const redisClient: any = redis.createClient(config.redis)

const subs: ISocketSub[] = []

export const setSub = (subscriber: ISocketSub) => subs.push(subscriber)
export const getSub = (topic: string) => {
  if (topic === 'all') {
    return subs
  } else {
    return subs.filter(
            subscriber =>
                subscriber.topic === topic && subscriber.socket.readyState === 1
        )
  }
}

// ------------------ Pub ------------------------------
// 增加 pub
export const setPub = (socketMessage: ISocketMessage) =>
    redisClient.lpushAsync(
        `socketMessage:${socketMessage.topic}`,
        JSON.stringify(socketMessage)
    )

// 消费 topic del
export const getPub = (topic: string): ISocketMessage[] => {
  return redisClient
        .lrangeAsync(`socketMessage:${topic}`, 0, -1)
        .then((data: any) => {
          if (data) {
            let localData: ISocketMessage[] = data.map((item: string) =>
                    JSON.parse(item)
                )
            // redisClient.del(`socketMessage:${topic}`)
            return localData
          }
        })
}

// ------------------ Notification ------------------------------
// 增加 notification
export const setNotification = (notification: INotification) => {
  console.log('setNotification',notification)
  return redisClient.lpushAsync(
        `notification:${notification.topic}`,
        JSON.stringify(notification)
    )
}

// 获取
export const getNotification = (topic: string) => {
  console.log('getNotification',topic)
  return redisClient
        .lrangeAsync(`notification:${topic}`, 0, -1)
        .then((data: any) => {
          if (data) {
            return data.map((item: string) => JSON.parse(item))
          }
        })
}
