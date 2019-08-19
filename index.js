var EventEmitter = require('events').EventEmitter
var bitfield = require('fast-bitfield')
var rle = require('bitfield-rle').align(4)

module.exports = progress

function progress (feed, stream) {
  var ev = new EventEmitter()
  stream.feeds.forEach(listen.bind(null, ev, feed))
  return ev
}

function listen (ev, feed, vfeed, feedIdx) {
  var peer = vfeed.peer
  var onhave = peer.onhave.bind(peer)

  var toDownload = bitfield()
  var toUpload = bitfield()
  var downloaded=0, uploaded=0
  var downloadTotal=0, uploadTotal=0

  var key = feed.key.toString('hex').slice(0, 6)

  feed.on('download', idx => {
    if (toDownload.get(idx)) {
      downloaded++
      ev.emit('progress', feed, { up: { sofar: uploaded, total: uploadTotal }, down: { sofar: downloaded, total: downloadTotal } })
    }
  })
  feed.on('upload', idx => {
    if (toUpload.get(idx)) {
      uploaded++
      ev.emit('progress', feed, { up: { sofar: uploaded, total: uploadTotal }, down: { sofar: downloaded, total: downloadTotal } })
    }
  })

  peer.onhave = function (have) {
    if (have.bitfield) {
      var downBuf = rle.decode(have.bitfield)
      var upBuf = Buffer.from(downBuf)

      remoteAndNotLocal(this.feed.bitfield, downBuf, this.remoteBitfield.littleEndian, have.start)
      var downbf = bitfield()
      downbf.fill(downBuf, have.start)
      var iter = downbf.iterator()
      var val
      while ((val = iter.next(1)) !== -1) {
        toDownload.set(val, 1)
        downloadTotal++
      }

      localAndNotRemote(this.feed.bitfield, upBuf, this.remoteBitfield.littleEndian, have.start)
      var upbf = bitfield()
      upbf.fill(upBuf, have.start)
      var iter = upbf.iterator()
      var val
      while ((val = iter.next(1)) !== -1) {
        toUpload.set(val, 1)
        uploadTotal++
      }
    }

    // call original 'onhave' logic
    onhave(have)
  }

  return ev
}

var EMPTY = new Uint8Array(1024)

function createView (page) {
  var buf = page ? page.buffer : EMPTY
  return new DataView(buf.buffer, buf.byteOffset, 1024)
}

function remoteAndNotLocal (local, buf, le, start) {
  var remote = new DataView(buf.buffer, buf.byteOffset)
  var len = Math.floor(buf.length / 4)
  var arr = new Uint32Array(buf.buffer, buf.byteOffset, len)
  var p = start / 8192 // 8192 is bits per bitfield page
  var l = 0
  var page = createView(local.pages.get(p++, true))

  for (var i = 0; i < len; i++) {
    arr[i] = remote.getUint32(4 * i, !le) & ~page.getUint32(4 * (l++), !le)

    if (l === 256) {
      page = createView(local.pages.get(p++, true))
      l = 0
    }
  }
}

function localAndNotRemote (local, buf, le, start) {
  var remote = new DataView(buf.buffer, buf.byteOffset)
  var len = Math.floor(buf.length / 4)
  var arr = new Uint32Array(buf.buffer, buf.byteOffset, len)
  var p = start / 8192 // 8192 is bits per bitfield page
  var l = 0
  var page = createView(local.pages.get(p++, true))

  for (var i = 0; i < len; i++) {
    arr[i] = ~remote.getUint32(4 * i, !le) & page.getUint32(4 * (l++), !le)

    if (l === 256) {
      page = createView(local.pages.get(p++, true))
      l = 0
    }
  }
}
