import axios from 'axios'
import { INotification } from './types'
import { getNotification } from './keystore'

export const pushNotification = async (topic: string) => {
  console.log('notification.webhook')
  const notifications = await getNotification(topic)

  if (notifications && notifications.length) {
    notifications.forEach((notification: INotification) => {
      console.log('notification.webhook', notification.webhook)
      axios.post(notification.webhook, { topic })
    })
  }
}
