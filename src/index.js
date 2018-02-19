'use strict'

// Get the list of commands with: for c in $(echo $(docker help | grep "^  " | sed -r "s|^(  [a-z]+).*|\1|g" | grep -v -)); do echo -n "\"$c\", "; done
// Get the list of commands that support --format: for c in $(echo $(docker help | grep "^  " | sed -r "s|^(  [a-z]+).*|\1|g" | grep -v -)); do docker $c --help | grep " --format" > /dev/null && echo -n "\"$c\", "; done

const {spawn} = require('child_process')
const debug = require('debug')
const log = debug('docker')

function captureStream (s) {
  let d = []
  s.on('data', data => d.push(data))
  return trim => trim ? Buffer.concat(d).toString().replace(/\n/g, '').trim() : Buffer.concat(d).toString()
}

const jsonSplit = '⑂'

const dockerCommands = ['container', 'image', 'network', 'node', 'plugin', 'secret', 'service', 'stack', 'swarm', 'system', 'volume', 'attach', 'build', 'commit', 'cp', 'create', 'diff', 'events', 'exec', 'export', 'history', 'images', 'import', 'info', 'inspect', 'kill', 'load', 'login', 'logout', 'logs', 'pause', 'port', 'ps', 'pull', 'push', 'rename', 'restart', 'rm', 'rmi', 'run', 'save', 'search', 'start', 'stats', 'stop', 'tag', 'top', 'unpause', 'update', 'version', 'wait']
const dockerCommandWithFormatSupport = ['events', 'images', 'info', 'inspect', 'ps', 'stats', 'version']

function spawnDocker (cmd, args, opt, cb) {
  if (typeof args === 'function') {
    cb = args
    args = []
    opt = {}
  }
  if (typeof opt === 'function') {
    cb = opt
    opt = {}
  }
  if (!Array.isArray(args)) {
    opt = {}
    args = []
  }
  if (!opt) opt = {}

  let o = [cmd]
  if (dockerCommandWithFormatSupport.indexOf(cmd) !== -1) opt.format = '{{ json . }}'
  for (var p in opt) {
    const v = opt[p]
    if (typeof v === 'boolean') {
      if (!v) o.push('--no-' + p)
      else o.push('--' + p)
    } else {
      o.push('--' + p + '=' + v)
    }
  }
  o = o.concat(args)
  log(...o)
  const _ = spawn('docker', o, {
    stdio: ['ignore', 'pipe', 'pipe']
  })
  const stdout = captureStream(_.stdout)
  const stderr = captureStream(_.stderr)

  _.on('exit', (ex, sig) => {
    if (ex || sig) {
      if (stderr(true)) return cb(new Error('docker error: ' + stderr(true)))
      return cb(new Error('docker exited with ' + (ex || sig)))
    }
    return cb(null, stdout().match(/^(\{|\[)/) ? stdout().match(/\}\n*\{/) ? stdout().split(/}\n*{/).join('}' + jsonSplit + '{').split(jsonSplit).map(JSON.parse) : JSON.parse(stdout()) : stdout(), stderr())
  })
}

function fabricateCommand (cmd) {
  let o = {}
  o['docker ' + cmd] = function (...a) {
    return spawnDocker(cmd, ...a)
  }
  return o['docker ' + cmd]
}

const self = module.exports

dockerCommands.forEach(cmd => {
  self[cmd] = fabricateCommand(cmd)
  self[cmd].array = (...a) => {
    const f = a.pop()
    const cb = (err, res, ...a) => {
      if (err) return f(err)
      if (typeof res === 'string' && !res.trim()) res = []
      if (!Array.isArray(res)) res = [res]
      f(err, res, ...a)
    }
    self[cmd](...a, cb)
  }
})
