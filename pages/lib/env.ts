function getHostname() {
  return process.env.HOST || 'https://www.maretol.com/'
}

function getLocalEnv() {
  return process.env.LOCAL || ''
}

function getNodeEnv() {
  return process.env.NODE_ENV || 'development'
}

export { getHostname, getLocalEnv, getNodeEnv }
