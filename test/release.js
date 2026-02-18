
describe("release", function() {
	var child = require("child_process")
	var path = require("path")
	var cli = require("..")
	var release = require("../lib/release.js")
	var pkgPath = path.resolve("package.json")

	function setup(mock, conf) {
		conf = conf || {}
		var curPkg = { version: conf.curVersion || "1.0.0", name: "test-pkg" }
		if (conf.private) curPkg.private = true

		mock.time(conf.date || "2026-02-15T00:00:00Z")

		mock.swap(require.cache, pkgPath, {
			id: pkgPath,
			filename: pkgPath,
			loaded: true,
			exports: curPkg
		})

		var execCalls = []
		mock.swap(child, "execSync", function(cmd) {
			execCalls.push(cmd)
			if (cmd === "git show HEAD:package.json") {
				return Buffer.from(JSON.stringify({ version: conf.comVersion || conf.curVersion || "1.0.0" }))
			}
			if (cmd.indexOf("git describe --tags") === 0) {
				return Buffer.from(conf.lastTag || "")
			}
			if (cmd.indexOf("git log -z --grep break") === 0) {
				return Buffer.from((conf.breakingCommits || []).join("\0"))
			}
			if (cmd.indexOf("git log --pretty") === 0) {
				return Buffer.from((conf.commits || []).join("\n"))
			}
			if (cmd === "git rev-parse @{upstream}") {
				throw new Error("no upstream")
			}
			if (conf.failCmd && cmd.indexOf(conf.failCmd) >= 0) {
				var err = new Error("command failed")
				err.stdout = Buffer.from("")
				err.stderr = Buffer.from("error output")
				throw err
			}
			return Buffer.from("")
		})

		var exitCode = conf.editorExitCode != null ? conf.editorExitCode : 0
		mock.swap(child, "spawn", mock.fn(function() {
			return {
				on: function(ev, fn) {
					if (ev === "exit") fn(exitCode)
					return this
				}
			}
		}))

		mock.swap(cli, "writePackage", mock.fn())
		mock.swap(cli, "writeFile", mock.fn())
		mock.swap(console, "log", mock.fn())
		mock.swap(console, "error", mock.fn())
		mock.swap(process, "exit", mock.fn())
		mock.swap(process.env, "EDITOR", "echo")

		return { pkg: curPkg, execCalls: execCalls }
	}

	function releaseOpts(extra) {
		return Object.assign({
			_: [],
			install: false,
			lint: false,
			update: false,
			global: false,
			build: false,
			test: false,
			rewrite: false,
			tag: true,
			commit: true,
			upstream: true
		}, extra)
	}

	it("should calculate version {0} -> {3}", [
		["26.2.3", "26.2.3", "2026-02-15T00:00:00Z", "26.2.4"],
		["26.1.5", "26.1.5", "2026-02-15T00:00:00Z", "26.2.0"],
		["25.12.3", "25.12.3", "2026-02-15T00:00:00Z", "26.2.0"],
		["1.0.0-beta.1", "1.0.0-beta.1", "2026-02-15T00:00:00Z", "1.0.0-beta.2"],
		["26.2.3", "26.2.3", "2026-11-15T00:00:00Z", "26.11.0"],
	], function(curVer, comVer, date, expected, assert, mock) {
		var m = setup(mock, { curVersion: curVer, comVersion: comVer, date: date })
		release(releaseOpts())
		assert.equal(m.pkg.version, expected)
		assert.equal(cli.writePackage.called, 1)
		assert.end()
	})

	it("should use explicit version", function(assert, mock) {
		var m = setup(mock, { curVersion: "26.2.3", comVersion: "26.2.3" })
		release(releaseOpts({ _: ["3.0.0"] }))
		assert.equal(m.pkg.version, "3.0.0")
		assert.end()
	})

	it("should not change version when already bumped", function(assert, mock) {
		var m = setup(mock, { curVersion: "26.2.4", comVersion: "26.2.3" })
		release(releaseOpts())
		assert.equal(m.pkg.version, "26.2.4")
		assert.equal(cli.writePackage.called, 0)
		assert.end()
	})

	it("should group commits by type", function(assert, mock) {
		setup(mock, {
			curVersion: "26.2.3",
			comVersion: "26.2.3",
			commits: [
				"Add user login (Alice)",
				"Fix login bug (Bob)",
				"Remove old API (Charlie)",
				"Update API endpoint (Dave)",
				"Refactor utils (Eve)"
			]
		})
		release(releaseOpts())
		var editmsg = cli.writeFile.calls[1].args[1]
		assert.ok(editmsg.indexOf("New Features:\n\n - Add user login (Alice)\n") > -1)
		assert.ok(editmsg.indexOf("Fixes:\n\n - Fix login bug (Bob)\n") > -1)
		assert.ok(editmsg.indexOf("Removed Features:\n\n - Remove old API (Charlie)\n") > -1)
		assert.ok(editmsg.indexOf("API Changes:\n\n - Update API endpoint (Dave)\n") > -1)
		assert.ok(editmsg.indexOf("Enhancements:\n\n - Refactor utils (Eve)\n") > -1)
		assert.ok(editmsg.indexOf("# Breaking Changes:\n") > -1)
		assert.end()
	})

	it("should abort on editor exit {0}", [
		[1], [2], [130]
	], function(code, assert, mock) {
		var m = setup(mock, {
			curVersion: "26.2.3",
			comVersion: "26.2.3",
			editorExitCode: code
		})
		release(releaseOpts())
		assert.ok(console.error.calls.some(function(c) {
			return String(c.args[0]).indexOf("Aborted") > -1
		}))
		assert.notOk(m.execCalls.some(function(cmd) {
			return cmd.indexOf("git commit") > -1
		}))
		assert.end()
	})

	it("should commit and tag on editor success", function(assert, mock) {
		var m = setup(mock, { curVersion: "26.2.3", comVersion: "26.2.3" })
		release(releaseOpts())
		assert.ok(m.execCalls.some(function(cmd) {
			return cmd.indexOf("git commit -a") > -1
		}))
		assert.ok(m.execCalls.some(function(cmd) {
			return cmd.indexOf("git tag -a") > -1
		}))
		assert.end()
	})

	it("should show npm publish for stable version", function(assert, mock) {
		setup(mock, { curVersion: "26.2.3", comVersion: "26.2.3" })
		release(releaseOpts())
		assert.ok(console.log.calls.some(function(c) {
			return String(c.args[0]).indexOf("PUBLISH") > -1 && c.args[1] === ""
		}))
		assert.end()
	})

	it("should show --tag next for prerelease", function(assert, mock) {
		setup(mock, { curVersion: "1.0.0-beta.1", comVersion: "1.0.0-beta.1" })
		release(releaseOpts())
		assert.ok(console.log.calls.some(function(c) {
			return String(c.args[1] || "").indexOf("--tag next") > -1
		}))
		assert.end()
	})

	it("should not show publish for private packages", function(assert, mock) {
		setup(mock, { curVersion: "26.2.3", comVersion: "26.2.3", private: true })
		release(releaseOpts())
		assert.notOk(console.log.calls.some(function(c) {
			return String(c.args[0]).indexOf("PUBLISH") > -1
		}))
		assert.end()
	})

	it("should exit on command failure", function(assert, mock) {
		setup(mock, {
			curVersion: "26.2.3",
			comVersion: "26.2.3",
			failCmd: "lj lint"
		})
		release(releaseOpts({ lint: true }))
		assert.equal(process.exit.calls[0].args, [1])
		assert.ok(console.error.calls.some(function(c) {
			return String(c.args[0]).indexOf("fatal") > -1
		}))
		assert.end()
	})
})
