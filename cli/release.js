
var TAG_MSG = ".git/TAG_MSG"
, child = require("child_process")
, path = require("path")
, cli = require("./")




if (module.parent) {
	// Used as module
	exports.execute = execute
}

function execute(args, i) {
	var g, i, msg
	, now = (new Date().toISOString().slice(2, 8) + "00").split(/-0?/)
	, com = JSON.parse(child.execSync("git show HEAD:package.json").toString("utf8"))
	, cur = require(path.resolve("package.json"))
	, junks = com.version.split(".")
	, len = junks.length
	, rewrite = args[i] === "-f"
	, lastTag = child.execSync("git describe --tags --abbrev=0 @^").toString("utf8").trim()
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

	if (!rewrite && com.version === cur.version) {
		if (len > 3 || !(now[0] > junks[0] || now[1] > junks[1])) {
			junks[len - 1] = parseInt(junks[len - 1], 10) + 1
		} else {
			junks = now
		}
		cur.version = junks.join(".")
		cli.writeFile("package.json", JSON.stringify(cur, null, "  ") + "\n")
	}

	msg = "Release " + cur.version + "\n\n"
	run(["build"])
	run(["test"])

	// TODO:2019-12-21:lauri:Build three times till hash calculation is fixed in build
	child.spawnSync("git", ["add", "-u"])
	child.spawnSync("lj", ["build"])
	child.spawnSync("git", ["add", "-u"])
	child.spawnSync("lj", ["build"])

	child.spawnSync("git", ["commit", "-a", "-m", msg, (rewrite ? "--amend" : "--")], { stdio: "inherit" })

	child.spawnSync("git", [
		"log", "--pretty=format:%s (%aN)", lastTag + "..@"
	]).stdout.toString("utf8").split("\n").forEach(function(row) {
		for (var g, i = 0; g = group[i++]; ) {
			if (!g.re || g.re.test(row)) {
				return g.log.push(row)
			}
		}
	})
	msg = ""
	for (i = 0; g = group[i++]; ) {
		if (g.log.length) {
			msg += g.name + ":\n\n - " + g.log.join("\n - ") + "\n\n"
		}
	}

	cli.writeFile(TAG_MSG, msg)

	child.spawn(process.env.EDITOR || "vim", [TAG_MSG], { stdio: "inherit" })
	.on("exit", function (e, code) {

		child.spawnSync("git", ["tag", "-a", "v" + cur.version, "-F", TAG_MSG, rewrite ? "-f" : "--"], { stdio: "inherit" })

		console.log(`VERSION: ${cur.version}`)
		if (!cur.private) {
			console.log(`PUBLISH: npm publish${len === 3?'':' --tag next'}`)
		}
	})

	function run(args) {
		var sub = child.spawnSync("lj", args)
		if (sub.status) {
			console.error(`EXIT: ${sub.status}`, args)
			process.stderr.write(sub.stderr)
			process.exit(1)
		}
		msg += sub.stdout.toString("utf8")
	}
}
