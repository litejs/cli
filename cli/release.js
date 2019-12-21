
var TAG_MSG = ".git/TAG_MSG"
, child = require("child_process")
, cli = require("./")




if (module.parent) {
	// Used as module
	exports.execute = execute
}

function execute(args, i) {
	var tmp
	, msg = ""
	, now = (new Date().toISOString().slice(2, 8) + "0").split("-")
	, com = JSON.parse(child.execSync("git show HEAD:package.json").toString("utf8"))
	, cur = require("../../package.json")
	, junks = com.version.split(".")
	, len = junks.length
	, rewrite = args[i] === "-f"
	, lastTag = child.execSync("git describe --tags --abbrev=0 @^").toString("utf8").trim()

	if (!rewrite && com.version === cur.version) {
		if (len > 3 || !(now[0] > junks[0] || now[1] > junks[1])) {
			junks[len - 1] = parseInt(junks[len - 1], 10) + 1
		} else {
			junks = now
		}
		cur.version = junks.join(".")
		cli.writeFile("package.json", JSON.stringify(cur, null, "  ") + "\n")
	}

	msg += "Version " + cur.version + "\n\n"
	msg += "API Changes:\n\nNew Features:\n\nEnhancements:\n\nBreaking Changes:\n"
	msg += child.spawnSync("git", ["log", "--grep", "break", "-i", lastTag + "..@"], {stdio: ["ignore", "pipe", "inherit"]}).stdout.toString("utf8")
	msg += "\n\nFixes:\n\nRemoved Features:\n\n"
	msg += child.spawnSync("git", ["log", lastTag + "..@"]).stdout.toString("utf8")
	msg += child.spawnSync("lj", ["build"]).stdout.toString("utf8")

	// TODO:2019-12-21:lauri:Build three times till hash calculation is fixed in build
	child.spawnSync("git", ["add", "-u"])
	child.spawnSync("lj", ["build"])
	child.spawnSync("git", ["add", "-u"])
	child.spawnSync("lj", ["build"])

	msg += child.spawnSync("lj", ["test"]).stdout.toString("utf8").split("\n").slice(-3).join("\n")

	child.spawnSync("git", ["commit", "-a", "-m", "Release " + cur.version, rewrite ? "--amend" : []], { stdio: "inherit" })

	cli.writeFile(TAG_MSG, msg)

	var editor = process.env.EDITOR || "vim"

	child.spawn(editor, [TAG_MSG], { stdio: "inherit" })
	.on("exit", function (e, code) {

		child.spawnSync("git", ["tag", "-a", "v" + cur.version, "-F", TAG_MSG, rewrite ? "-f" : []], { stdio: "inherit" })

		console.log(`VERSION: ${cur.version}`)
		console.log(`PUBLISH: npm publish${len === 3?'':' --tag next'}`)
	})
}

