'use strict'

const docker = require('libdocker')

docker.run(['ubuntu:17.10'], err => { // run an ubuntu:17.10 container
  if (err) throw err
  docker.ps.array(['-a'], (err, res, stderr) => { // get the list of all containers
    console.log(err, res, stderr)
    /*
    Example:
    null [ { Command: '"/bin/bash"',
        CreatedAt: '2018-02-19 14:25:44 +0100 CET',
        ID: '64073efbd38b',
        Image: 'ubuntu:17.10',
        Labels: '',
        LocalVolumes: '0',
        Mounts: '',
        Names: 'inspiring_bardeen',
        Networks: 'bridge',
        Ports: '',
        RunningFor: '10 seconds',
        Size: '0 B',
        Status: 'Exited (0) 8 seconds ago' } ] ''
    */
  })
})
