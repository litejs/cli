//-
//-  Deletes node_modules, runs `npm install`,
//-  runs `lj build` and `lj test`, updates version in package.json,
//-  commit and create version tag.
//-
//-  Usage
//-    lj release [version]
//-
//-  release options
//-    --no-build      Do not run build
//-    --no-global     Ignore outdated global packages
//-    --no-install    Do not remove node_modules and install again
//-    --no-lint       Ignore linter errors
//-    --no-test       Do not execute tests
//-    --no-update     Ignore outdated dependencies
//-    --no-upstream   Ignore new commits on upstream
//-    --rewrite       Rewrite last tag
//-
//-  Examples
//-    lj r --no-install
//-


module.exports = function(opts) {
	var g
	, TAG_MSG = ".git/TAG_MSG"
	, child = require("child_process")
	, path = require("path")
	, cli = require("../")
	, cur = require(path.resolve("package.json"))
	, msg = ""
	, now = (new Date().toISOString().slice(2, 8) + "00").split(/-0?/)
	, com = JSON.parse(child.execSync("git show HEAD:package.json").toString("utf8"))
	, junks = com.version.split(".")
	, len = junks.length
	, lastTag = child.execSync("git describe --tags --abbrev=0 2>/dev/null||true").toString("utf8").trim()
	, logRange = lastTag ? lastTag + "..@" : ""
	, group = [
		{ name: "New Features",      re: /\badd\b/i, log: [] },
		{ name: "Removed Features",  re: /\b(remove|drop)\b/i, log: [] },
		{ name: "API Changes",       re: /\bapi\b/i, log: [] },
		{ name: "Breaking Changes",  re: /\bbreak[ei]/i,
			log: child.execSync("git log -z --grep break -i " + logRange)
			.toString("utf8").split("\0").filter(Boolean)
		},
		{ name: "Fixes",             re: /fix\b/i, log: [] },
		{ name: "Enhancements",      re: null, log: [] }
	]

	try {
		child.execSync("git rev-parse @{upstream}")
		run("upstream", "git fetch;git merge-base --is-ancestor @{upstream} HEAD", "fast-forward with upstream is not possible")
	} catch(e) {}

	run("lint", opts.lint, "code does not comply to rules")
	run("install", "rm -rf node_modules;npm install", "dependencies can not be installed")
	run("update", "npm outdated", "there are outdated dependencies")
	run("global", "npm outdated -g @litejs/cli " + (opts.global || "uglify-js jshint nyc"), "there are outdated global packages")

	if (opts.args[0] || !opts.rewrite && com.version === cur.version) {
		if (len > 3 || !(now[0] > junks[0] || now[1] > junks[1])) {
			junks[len - 1] = parseInt(junks[len - 1], 10) + 1
		} else {
			junks = now
		}
		cur.version = opts.args[0] || junks.join(".")
		cli.writePackage(cur)
	}
	if (opts.rewrite) {
		child.execSync("git rebase --onto " + lastTag + "~1 " + lastTag + ";git cherry-pick " + lastTag)
		lastTag = child.execSync("git describe --tags --abbrev=0 HEAD~1 2>/dev/null||echo 0.0.0").toString("utf8").trim()
	} else run("tag", "! git rev-parse -q --verify v" + cur.version, "git tag exists?", "--rewrite")

	run("build", "lj b", "build failed")

	run("test", "lj test --brief", "tests failed")

	child.spawnSync("git", [
		"commit", "-a", "-m", "Release " + cur.version + "\n" + msg,
		(opts.rewrite ? "--amend" : "--")], { stdio: "inherit" })

	msg = "# All commits:\n"
	child.execSync("git log --pretty='format:%s (%aN)' " + logRange + (opts.rewrite ? "~1" : ""))
	.toString("utf8").split("\n").forEach(function(row) {
		msg += "# - " + row + "\n"
		for (var g, i = 0; (g = group[i++]); ) {
			if (!g.re || g.re.test(row)) return g.log.push(row)
		}
	})

	if (opts.rewrite) msg += child.execSync("git tag -l --format='%(contents)' v" + cur.version).toString("utf8")
	else for (i = 0; (g = group[i++]); ) {
		if (g.log.length) {
			msg += g.name + ":\n\n - " + g.log.join("\n - ") + "\n\n"
		} else {
			msg += "# " + g.name + ":\n"
		}
	}

	cli.writeFile(TAG_MSG, msg)

	child.spawn(process.env.EDITOR || "vim", [TAG_MSG], { stdio: "inherit" })
	.on("exit", function(e, code) {
		run("tag", "git tag -a v" + cur.version + " -F " + TAG_MSG + (opts.rewrite ? " -f" : ""), "git tag failed", "--rewrite")

		console.log("\nVERSION: %s", cur.version)
		if (!cur.private) {
			console.log("PUBLISH: npm publish%s", len === 3 ? "" : " --tag next")
		}
	})

	function run(opt, cmd, err, flag) {
		if (cmd && opts[opt] !== false) try {
			log("\n-- " + cmd)
			log(child.execSync(cmd))
		} catch (e) {
			log(e.stdout)
			log(e.stderr)
			console.error("\nfatal: %s! Ignore with %s option.", err, flag || "--no-" + opt)
			process.exit(1)
		}
	}

	function log(str) {
		if (str.length > 0) {
			if (typeof str !== "string") str = str.toString("utf8").trim()
			msg += str + "\n"
			console.log(str)
		}
	}
}

