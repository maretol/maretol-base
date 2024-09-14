function getHostname() {
  return process.env.HOST || 'https://www.maretol.com/'
}

function getNodeEnv() {
  return process.env.NODE_ENV || 'development'
}

export { getHostname, getNodeEnv }
