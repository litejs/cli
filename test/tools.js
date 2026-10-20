
describe("tools", function() {
	var fs = require("fs")
	, child = require("child_process")
	, path = require("path")
	, cli = require("..")

	it ("should check command exists", [
		[ "node", true ],
		[ "nnn-non-existing", false ]
	], function(cmd, expected, assert) {
		assert.equal(cli.command(cmd), expected).end()
	})

	it ("should create and remove files", function(assert, mock) {
		var errLog = mock.fn()
		mock.swap(console, "error", errLog)

		assert.throws(function() {
			fs.statSync("test/blabla")
		})

		cli.mkdirp("")
		cli.mkdirp("test/blabla/deep")

		fs.statSync("test/blabla")

		cli.rmrf("test/blabla")

		assert.throws(function() {
			fs.statSync("test/blabla")
		})
		assert.throws(function() {
			cli.rmrf("/")
		})
		assert.end()
	})

	if (process.platform === "linux") it ("should list files: {0}", [
		"test/index.js",
		"*.js",
		"test/[ab]*.js",
		"test/**/a*.js",
	], function(glob, assert) {
		assert.equal(
			cli.ls(glob).join(" "),
			child.execSync("bash -c 'shopt -s globstar;echo " + glob + "'").toString("utf8").trim()
		)
		assert.end()
	})

	it ("should list .dot files", function(assert) {
		cli.mkdirp(".github/.dot")
		cli.cp("package.json", ".github/.dot/p.json")
		cli.cp(".github/.dot", ".github/.dot2")
		if (process.platform === "linux") assert.equal(
			cli.ls(".*/.d*", null, ".github").join(" "),
			child.execSync("bash -c 'shopt -s globstar;echo .github .*/.d*'").toString("utf8").trim()
		)
		// Assert options
		assert.equal(cli.ls(".github/*", { dir: false }).join(" "), ".github/jshint.json .github/litejs.json")
		assert.equal(cli.ls("*", { cwd: ".github", dir: false }).join(" "), "jshint.json litejs.json")
		var stats = cli.ls("*", { cwd: ".github", stat: true }).map(s=>({size: s.size, name: s.name}))
		assert.equal(stats.length, 3)
		assert.equal(stats[0].size, 232)
		assert.equal(stats[2].name, "workflows")
		assert.equal(cli.ls(".github/*", { file: false }).join(" "), ".github/workflows")
		assert.equal(cli.ls(".github/*", { file: false, root: "/www/" }).join(" "), "/www/.github/workflows")
		assert.equal(cli.ls(".github/*", { file: false, absolute: true }).join(" "), path.join(process.cwd(), ".github/workflows").replace(/\\/g, "/"))
		assert.equal(cli.ls(".github/*", { dot: true }).join(" "), ".github/.dot .github/.dot2 .github/jshint.json .github/litejs.json .github/workflows")
		cli.rmrf(".github/.dot")
		cli.rmrf(".github/.dot2")
		assert.end()
	})

	it ("should deepAssign", function(assert) {
		cli.deepAssign({}, JSON.parse('{"__proto__": {"devMode": true}}'))
		assert.notOk({}.devMode)
		assert.equal(cli.deepAssign({ a: { b: 1, c: 2 }, d: 3 }, null, { a: { b: 4 }, d: null }), { a: { b: 4, c: 2 } })
		assert.equal(cli.deepAssign(Object.prototype, { devMode: true }).devMode, void 0)
		assert.end()
	})

	it ("should debounce", function(assert, mock) {
		mock.time()
		var fn = mock.fn()
		, scope = {}
		, debounced = cli.debounce(fn, 100)
		debounced.call(scope, 1)
		mock.tick(50)
		debounced.call(scope, 2)
		mock.tick(99)
		assert.equal(fn.calls.length, 0)
		mock.tick(1)
		assert.equal(fn.calls.length, 1)
		assert.equal(fn.calls[0].args, [2])
		assert.equal(fn.calls[0].scope, scope)
		cli.debounce(fn)()
		mock.tick(300)
		assert.equal(fn.calls.length, 2)
		assert.end()
	})

	it ("should wait", function(assert, mock) {
		var fn = mock.fn()
		, resume = cli.wait(fn)
		, a = resume.wait()
		, b = resume.wait()
		resume()
		a()
		assert.equal(fn.calls.length, 0)
		b()
		assert.equal(fn.calls.length, 1)
		cli.wait()()
		assert.end()
	})

	it ("should hold calls until resumed", function(assert, mock) {
		var log = []
		, Obj = function() {}
		, obj
		Obj.prototype.a = function(x) {
			log.push("a" + x)
		}
		obj = new Obj()
		obj.b = function(x) {
			log.push("b" + x)
			return obj
		}
		obj.c = function() {
			log.push("c")
		}
		obj.syncMethods = ["c"]
		var resume = cli.hold.call(obj)
		, more = obj.wait()
		assert.equal(obj.a(1), obj)
		obj.b(2).c()
		assert.equal(log, ["c"])
		resume()
		assert.equal(log, ["c"])
		more()
		assert.equal(log, ["c", "a1", "b2"])
		assert.notOk(Object.prototype.hasOwnProperty.call(obj, "a"))
		assert.end()
	})

	it ("should watch files", function(assert, mock) {
		var cb = mock.fn()
		, file = "test/watch-tmp.txt"
		, watchers = []
		mock.swap(fs, "watch", function(name, fn) {
			var w = { name: name, fn: fn, close: mock.fn() }
			watchers.push(w)
			return w
		})
		mock.time()
		cli.writeFile(file, "a")
		var w = cli.watch([file, "test/missing-dir/x"], cb, 10)
		w.add([file])
		assert.equal(watchers.length, 2)
		watchers[0].fn()
		watchers[0].fn()
		assert.equal(watchers[0].close.calls.length, 1)
		mock.tick(10)
		assert.equal(cb.calls.length, 1)
		assert.equal(watchers.length, 3)
		assert.equal(watchers[2].name, file)
		mock.swap(fs, "watch", function() {
			throw Error("ENOENT")
		})
		watchers[2].fn()
		mock.tick(10)
		assert.equal(cb.calls.length, 2)
		cli.rmrf(file)
		assert.end()
	})

	it ("should write package.json without cmd and name", function(assert, mock) {
		var written
		mock.swap(fs, "writeFileSync", function(name, content) {
			written = [name, content]
		})
		cli.writePackage({ name: "x", litejs: { cmd: "build", name: "y", build: true } })
		assert.equal(written, [path.resolve("package.json"), '{\n  "name": "x",\n  "litejs": {\n    "build": true\n  }\n}\n'])
		cli.writePackage({ name: "x" })
		assert.equal(written[1], '{\n  "name": "x"\n}\n')
		assert.end()
	})
})

