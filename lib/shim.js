
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
	fs.rmSync = function(dir, opts) {
		rmShim(dir, Object.assign({
			force: false,
			maxRetries: 0,
			recursive: false,
			retryDelay: 100
		}, opts))
	}
}
function rmShim(dir, opts) {
	try {
		if (fs.lstatSync(dir).isDirectory()) {
			if (!opts.recursive) throw "rm isDirectory"
			for (var arr = fs.readdirSync(dir), i = arr.length; i--; ) {
				rmShim(path.join(dir, arr[i]), opts)
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
