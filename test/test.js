var ram = require('random-access-memory')
var hypercore = require('hypercore')
var pump = require('pump')
var progress = require('../index')
var test = require('tape')

test('basic', t => {
  var core1 = hypercore(ram, {valueEncoding:'json'})
  core1.ready(() => {
    core1.append([
      'ichi',
      'ni',
      'san',
    ], () => {
      var core2 = hypercore(ram, core1.key, {valueEncoding:'json'})
      core2.ready(() => {
        var r = core1.replicate()
        pump(r, core2.replicate(), r, err => {
          t.error(err)

          core1.clear(0, 3)

          var core3 = hypercore(ram, core1.key, {valueEncoding:'json'})
          core3.ready(() => {
            core1.append([
              'shi',
              'go'
            ], () => {
              var r = core1.replicate()
              pump(r, core3.replicate(), r, err => {
                // XXX: hypercore bug? never reached
                t.error(err)
              })

              setTimeout(() => {
                var r1 = core2.replicate()
                var p1 = progress(core2, r1, 2)
                var last1
                p1.on('progress', info => {
                  last1 = info
                })

                var r2 = core3.replicate() 
                var p2 = progress(core3, r2, 3)
                var last2
                p2.on('progress', info => {
                  last2 = info
                })

                pump(r1, r2, r1, err => {
                  // XXX: hypercore bug? never reached
                  t.error(err)
                })

                setTimeout(() => {
                  t.deepEqual(last1, { up: { sofar: 3, total: 3 }, down: { sofar: 2, total: 2 } })
                  t.deepEqual(last2, { up: { sofar: 2, total: 2 }, down: { sofar: 3, total: 3 } })
                  t.end()
                }, 1000)
              }, 1000)
            })
          })
        })
      })
    })
  })
})
