//-
//-  Usage
//-    lj ui-test [URL_PATH]
//-
//-  Options
//-    --port          Server port (default: 8091)
//-    --budget        Virtual time budget in ms (default: 5000)

var { command } = require("..")
, consoleRe = /^[\s\S]*INFO:CONSOLE[^"]*"([\s\S]*)/

module.exports = function(opts) {
	var output = ""
	, buf = ""
	, urlPath = opts._[0] || "test/index.html"
	, browser = ["google-chrome-stable", "google-chrome", "chromium-browser", "chromium"].find(command)
	, retries = 10
	opts._ = []

	if (!browser) {
		console.error("No browser found")
		process.exitCode = 1
		return
	}

	var server = require("./serve")(opts)
	.on("error", function(e) {
		if (e.code === "EADDRINUSE" && retries--) return server.listen(++opts.port, "127.0.0.1")
		console.error(e.message)
		process.exitCode = 1
	})
	.on("listening", function() {
		var url = "http://127.0.0.1:" + opts.port + "/" + urlPath
		, proc = require("child_process").spawn(browser, [
			"--headless",
			"--virtual-time-budget=" + opts.budget,
			"--enable-logging=stderr",
			"--no-sandbox",
			url
		], { stdio: ["ignore", "ignore", "pipe"] })

		proc.stderr.on("data", function(chunk) {
			buf += chunk
			var lines = buf.split(/", source: .*\n/m)
			buf = lines.pop()
			lines.forEach(parseLine)
		})

		proc.on("close", function() {
			parseLine(buf)
			server.close()
			process.exitCode = /\u2714/.test(output) && !/FAIL|\u2718/.test(output) ? 0 : 1
		})
	})

	function parseLine(line) {
		var match = consoleRe.exec(line)
		if (match) {
			console.log(match[1])
			output += match[1]
		}
	}
}

