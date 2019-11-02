# hypercore-progress

> track the sync progress of a non-sparse non-live hypercore replication stream

**N.B.** Designed for `hypercore@8`

**N.B.** This should give accurate download and upload progress when sparse
mode is *off*. However, when using sparse mode, download progress should remain
accurate, but upload progress can be inaccurate. This is due to how the
hypercore protocol works: the remote peer doesn't have to explicitly name the
blocks it wants -- it can provide a range of wants that may include blocks it
already possesses. Live streams aren't yet supported either.

## Usage

```js
var progress = require('hypercore-progress')
var ram = require('random-access-memory')
var hypercore = require('hypercore')
var pump = require('pump')

var core1 = hypercore(ram, {valueEncoding:'json'})
core1.ready(() => {
  core1.append([
    'ichi',
    'ni',
    'san',
  ], () => {
    var core2 = hypercore(ram, core1.key, {valueEncoding:'json'})
    core2.ready(() => {
      sync()
    })
  })
})

function sync () {
  var r1 = core1.replicate()
  progress(r1).on('progress', (status) => {
    console.log('core1', status)
  })

  var r2 = core2.replicate()
  progress(r1).on('progress', (status) => {
    console.log('core1', status)
  })

  pump(r1, r2, r1, err => {
    console.log('done')
  })
})
```

outputs

```
core1 { up: { sofar: 1, total: 3 }, down: { sofar: 0, total: 0 } }
core2 { up: { sofar: 0, total: 0 }, down: { sofar: 1, total: 3 } }
core1 { up: { sofar: 2, total: 3 }, down: { sofar: 0, total: 0 } }
core2 { up: { sofar: 0, total: 0 }, down: { sofar: 2, total: 3 } }
core1 { up: { sofar: 3, total: 3 }, down: { sofar: 0, total: 0 } }
core2 { up: { sofar: 0, total: 0 }, down: { sofar: 3, total: 3 } }
done
```

## API

```js
var progress = require('hypercore-progress')
```

### var tracker = progress(stream)

Wraps a [`hypercore-protocol`](https://github.com/mafintosh/hypercore-protocol)
stream and tracks upload and download progress of the hypercores it is
replicating.

### tracker.on('progress', (state) => {})

Emitted when a chunk is downloaded or uploaded.

`state` will be of the shape

```js
{
  up: { sofar: 5, total: 12 },
  down: { sofar: 1, total: 3 }
}
```

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install hypercore-progress
```

## Caveats

This module is pretty hacky and makes some assumptions:

1. "live" replication mode is not being used
2. "sparse" replication mode is not being used

## License

MIT
