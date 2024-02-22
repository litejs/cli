


module.exports = function(opts) {
	var fs = require("fs")
	, http = require("http")
	, path = require("path")
	, root = path.resolve(opts._[0] || "ui")
	, mime = {
		css: "text/css; charset=UTF-8",
		csv: "text/csv; charset=UTF-8",
		cur: "image/vnd.microsoft.icon",
		gif: "image/gif",
		html: "text/html; charset=UTF-8",
		ico: "image/x-icon",
		jpeg: "image/jpeg",
		jpg: "image/jpeg",
		js: "text/javascript; charset=UTF-8",
		json: "application/json",
		manifest: "text/cache-manifest; charset=UTF-8",
		mjs: "text/javascript; charset=UTF-8",
		png: "image/png",
		svg: "image/svg+xml",
		tgz: "application/x-tar-gz",
		tiff: "image/tiff",
		ttf: "font/ttf",
		txt: "text/plain; charset=UTF-8",
		weba: "audio/webm",
		webm: "video/webm",
		webp: "image/webp",
		zip: "application/zip"
	}

	http.createServer(function(req, res) {
		console.log(new Date(), req.method, req.url)

		var file = path.join(root, req.url.slice(1))
		if (file.slice(0, root.length) !== root) return sendStatus(res, 400)

		sendFile(res, file)
	})
	.listen(opts.port, function() {
		console.log(new Date(), "Listen http at", this.address())
	})

	function sendFile(res, file) {
		fs.stat(file, function(err, stat) {
			if (err) return sendStatus(res, 404)
			if (stat.isDirectory()) return sendFile(res, file + "/index.html")
			var ext = file.split("?")[0].split(".").pop()
			res.setHeader("Content-type", mime[ext] || "application/octet-stream")
			fs.createReadStream(file).pipe(res)
		})
	}
	function sendStatus(res, code) {
		res.statusCode = code
		res.end(http.STATUS_CODES[code] || "Status " + code)
	}
}
