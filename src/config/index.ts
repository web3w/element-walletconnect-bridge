const env = process.env.NODE_ENV || 'development'
const debug = env !== 'production'
const port = process.env.PORT || (env === 'production' ? 5000 : 5001)
const host = process.env.HOST || `0.0.0.0:${port}`

// redis://172.16.10.29:6379/8
//  redis://172.16.0.33:6380/8
// 'redis://47.74.58.188:6380/8',
const redis = {
  url: 'redis://127.0.0.1:6379/8',
  prefix:  'wc-',
  password: 'WLRRSx5n4oShW9'
}

export default {
  env: env,
  debug: debug,
  port,
  host,
  redis
}
