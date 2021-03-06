
var cli = require("..")
, child = require("child_process")
, path = require("path")

module.exports = function(opts) {
	var subOpts
	, files = cli.ls(opts.args.filter(isNaN))
	, nums = opts.args.filter(Number)
	, test = path.resolve(module.filename, "../../test.js")
	if (!files[0]) return console.error("No files found: " + opts.args)

	process.exitCode = 0

	if (!opts.threads && files.length < 10 && opts.nodeArgs.length < 1) {
		process.argv.length = 2
		nums.push.apply(process.argv, nums.concat(opts.opts))
		require(test)
		files.forEach(function(file) { require(path.resolve(file)) })
	} else {
		opts.nodeArgs.push("-r", test)
		subOpts = {
			//env: {
			//	NODE_PATH: process.argv[1].replace(/bin\/\w+$/, "lib/node_modules/")
			//},
			stdio: "inherit"
		}
		var threads = opts.threads
		if (!threads || threads === true) threads = require("os").cpus().length
		for (; threads--; run());
	}
	function run() {
		if (!files[0]) return
		var runFiles = files.splice(0, 10)
		, last = runFiles.pop()
		, args = []
		runFiles.forEach(function(file) {
			args.push("-r", "./" + file)
		})
		child.spawn(process.argv[0], opts.nodeArgs.concat(args, last, opts.opts), subOpts)
		.on("close", function(code) { process.exitCode += code; run() })
	}
}

