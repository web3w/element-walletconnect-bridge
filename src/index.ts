import Fastify,{ FastifyInstance, RouteShorthandOptions } from 'fastify'
import Helmet from 'fastify-helmet'
import WebSocket from 'ws'
import config from './config'
import pubsub from './pubsub'
import { getPub, getSub, setNotification } from './keystore'
import { IWebSocket } from './types'
import pkg from '../package.json'
import walletData from '../wallet.json'

const getIPAdress = () => {
  let interfaces = require('os').networkInterfaces()
  for (let devName in interfaces) {
    let iface = interfaces[devName]
    for (let i = 0; i < iface.length; i++) {
      let alias = iface[i]
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address
      }
    }
  }
}

const app: FastifyInstance = Fastify({
  logger: true
})

app.register(Helmet)

app.get('/health', (_, res) => {
  res.status(204).send()
})

app.get('/hello', (req, res) => {
  res.status(200).send(`Hello World, this is WalletConnect v${pkg.version}`)
})

app.get('/info', (req, res) => {
  res.status(200).send({
    name: pkg.name,
    description: pkg.description,
    version: pkg.version
  })
})

app.get('/data/wallets', (req, res) => {
  res.status(200).send(walletData)
})

app.post('/subscribe', async (req, res) => {
  console.log('app/subscribe')
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).send({
      message: 'Error: missing or invalid request body'
    })
  }

  // @ts-ignore
  const { topic, webhook } = req.body

  if (!topic || typeof topic !== 'string') {
    res.status(400).send({
      message: 'Error: missing or invalid topic field'
    })
  }

  if (!webhook || typeof webhook !== 'string') {
    res.status(400).send({
      message: 'Error: missing or invalid webhook field'
    })
  }

  await setNotification({ topic, webhook })

  res.status(200).send({
    success: true
  })
})

// 服务验证接口-- 生成不使用
app.get('/get_subscribe',async (req, res) => {
  // tslint:disable-next-line:no-multi-spaces
  const sub =  getSub('all').map(val => {
    return {
      topic: val.topic,
      socketReadyState: val.socket.readyState,
      socketIsAlive: String(val.socket.isAlive)
    }
  })

  res.status(200).send({ sub })
})

//
app.ready(() => {
  // 将 ws 服务绑定到 app 中
  const wsServer = new WebSocket.Server({ server: app.server,noServer: false })
  // 增加ws的链接时间监听
  wsServer.on('connection', (socket: IWebSocket) => {
    socket.on('message', async data => {
      // dApp 的初始化 sub
      // dApp 创建二维码 pub
      // wallet 扫码
      // wallet 断开链接
      console.log('message',data.toString())
      pubsub(socket, data, app.log)
    })
    socket.on('pong', () => {
      // 监听 dApp ws 的活跃情况 type: "sub"
      // console.log('pong ',getIPAdress(),socket.readyState)
      socket.isAlive = true
      console.log('pong readyState',socket.readyState)
    })

    socket.on('ping', () => {
      // 无
      console.log('ping ',socket)
    })

    socket.on('error', (e: Error) => {
      console.log('socket.on error',e)
      if (!e.message.includes('Invalid WebSocket frame')) {
        console.log(e)
        // socket.terminate()
        throw e
      }
      app.log.warn({ type: e.name, message: e.message })
    })

    socket.on('close', function close (code,foo) {
      console.log('close close-------------',code,socket.isAlive)
      // wallet 后台运行
      if (code === 1006) {

      }
      // socket server 重启清空
      // dApp 刷新
      // dApp disconnect
      if (code === 1001) {

      }

    })

    socket.on('open', function open () {
      console.log('open open-------------')
    })

    socket.on('headers', function open (res: any) {
      console.log('headers',res)
      socket.send(Date.now())
    })

    socket.on('upgrade', function open (res: any) {
      console.log('upgrade',res)
      socket.send(Date.now())
    })
  })

  wsServer.on('upgrade', function upgrade (request, socket, head) {
    console.log('wsServer.upgrade', request.url)
  })
  // 定时轮询 ws链接的客户端 处理链接请求
  setInterval(
    () => {
      // 查询当前的链接数量
      // const serverAddr = wsServer.address()
      // console.log('serverAddr',serverAddr)
      const sockets: any = wsServer.clients

      sockets.forEach((socket: IWebSocket) => {
        console.log('wsServer.clients 30',socket.isAlive, 'readyState',socket.readyState)
        if (socket.isAlive === false) {
          // 终止
          return socket.terminate()
        }

        function noop (res: any) {
          // console.log('setInterval ping ',res)
        }

        socket.isAlive = false
        socket.ping(noop)
      })
    },
    6000000 // 10 seconds
  )
})

const start = async () => {
  const [host, port] = config.host.split(':')
  try {
    await app.listen(port, getIPAdress())
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
