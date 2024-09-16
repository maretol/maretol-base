function getHostname() {
  return process.env.HOST || 'https://www.maretol.com/'
}

function getLocalEnv() {
  if (getNodeEnv() === 'development') {
    // local起動は指定して local を返す
    return 'local'
  }
  return process.env.LOCAL || ''
}

function getNodeEnv() {
  return process.env.NODE_ENV || 'development'
}

export { getHostname, getLocalEnv, getNodeEnv }
