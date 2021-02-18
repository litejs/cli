//-
//-  Deletes node_modules, runs `npm install`,
//-  runs `lj build` and `lj test`, updates version in package.json,
//-  commit and create version tag.
//-
//-  Usage
//-    lj release
//-
//-  release options
//-    --no-build      Do not run build
//-    --no-global     Ignore outdated global packages
//-    --no-install    Do not remove node_modules and install again
//-    --no-lint       Ignore linter errors
//-    --no-test       Do not execute tests
//-    --no-update     Ignore outdated dependencies
//-    --no-upstream   Ignore new commits on upstream
//-    --rewrite       Rewrite current tag
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
	, lastTag = child.execSync("git describe --tags --abbrev=0 2>/dev/null||git rev-list --max-parents=0 HEAD").toString("utf8").trim()
	, group = [
		{ name: "New Features",      re: /add\b/i, log: [] },
		{ name: "Removed Features",  re: /remove\b/i, log: [] },
		{ name: "API Changes",       re: /api\b/i, log: [] },
		{ name: "Breaking Changes",  re: /breake\b/i,
			log: child.spawnSync("git", [
				"log", "-z", "--grep", "break", "-i", lastTag + "..@"
			], {stdio: ["ignore", "pipe", "inherit"]})
			.stdout.toString("utf8").split("\0").filter(Boolean)
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

	if (!opts.rewrite && com.version === cur.version) {
		if (len > 3 || !(now[0] > junks[0] || now[1] > junks[1])) {
			junks[len - 1] = parseInt(junks[len - 1], 10) + 1
		} else {
			junks = now
		}
		cur.version = junks.join(".")
		cli.writePackage(cur)
	}

	if (opts.build !== false) {
		run("build", "lj build", "build failed")
		// TODO:2019-12-21:lauri:Build three times till hash calculation is fixed in build
		child.execSync("git add -u;lj b;git add -u;lj b", { stdio: "ignore" })
	}

	run("test", "lj test --brief", "tests failed")

	child.spawnSync("git", [
		"commit", "-a", "-m", "Release " + cur.version + "\n" + msg,
		(opts.rewrite ? "--amend" : "--")], { stdio: "inherit" })

	child.spawnSync("git", [
		"log", "--pretty=format:%s (%aN)", lastTag + "..HEAD~1"
	]).stdout.toString("utf8").split("\n").forEach(function(row) {
		for (var g, i = 0; (g = group[i++]); ) {
			if (!g.re || g.re.test(row)) {
				return g.log.push(row)
			}
		}
	})
	msg = ""
	for (i = 0; (g = group[i++]); ) {
		if (g.log.length) {
			msg += g.name + ":\n\n - " + g.log.join("\n - ") + "\n\n"
		} else {
			msg += "# " + g.name + ":\n"
		}
	}

	cli.writeFile(TAG_MSG, msg)

	child.spawn(process.env.EDITOR || "vim", [TAG_MSG], { stdio: "inherit" })
	.on("exit", function(e, code) {
		child.spawnSync("git", ["tag", "-a", "v" + cur.version, "-F", TAG_MSG, opts.rewrite ? "-f" : "--"], { stdio: "inherit" })

		console.log("\nVERSION: %s", cur.version)
		if (!cur.private) {
			console.log("PUBLISH: npm publish%s", len === 3 ? "" : " --tag next")
		}
	})

	function run(opt, cmd, err) {
		if (cmd && opts[opt] !== false) try {
			log("\n-- " + cmd)
			log(child.execSync(cmd))
		} catch (e) {
			log(e.stdout)
			log(e.stderr)
			console.error("\nfatal: %s! Ignore with --no-%s option.", err, opt)
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

