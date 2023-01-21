
var fs = require("fs")
, path = require("path")

if (!Buffer.from) {
	// Added in: v5.10.0
	Buffer.from = Buffer.allocUnsafe = function(arg, enc, len) {
		return new Buffer(arg, enc, len)
	}
	Buffer.allocUnsafe = function(len) {
		return new Buffer(len)
	}
	Buffer.alloc = function (len, fill, enc) {
		return new Buffer(len).fill(fill, enc)
	}
}

if (!fs.copyFileSync) {
	// Added in: v8.5.0
	fs.copyFileSync = function(src, dest) {
		fs.writeFileSync(dest, fs.readFileSync(src))
	}
}

if (!fs.rmSync) {
	// Added in: v14.14.0
	// On windows unlinking an opened file will mark it for deletion and the file is still there until it is closed.
	// With anti-virus software, renaming immediately after creation fails with EPERM error, as A/V locking up files for scanning time.

	fs.rmSync = function(dir, opts_) {
		rm(dir, Object.assign({ force: false, maxRetries: 0, recursive: false, retryDelay: 100 }, opts_))

		function rm(dir, opts) {
			try {
				if (fs.lstatSync(dir).isDirectory()) {
					if (!opts.recursive) throw "rm isDirectory"
					for (var arr = fs.readdirSync(dir), i = arr.length; i--; ) {
						rm(path.join(dir, arr[i]), opts)
					}
					fs.rmdirSync(dir)
				} else {
					fs.unlinkSync(dir)
				}
			} catch (e) {
				if (opts.force && e.code === "ENOENT") return
				throw e
			}
		}
	}
}

if (!process.versions) {
	// for iotjs
	process.versions = {}
}


