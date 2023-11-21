#!/usr/bin/env node

var cli = require("..")
, files = cli.ls(process.argv.slice(2))
, formatNeeded = files.filter(function(file) {
	var str = cli.readFile(file)
	try {
		return str.trim() !== JSON.stringify(JSON.parse(str), null, 2)
	} catch(e) {
		console.error(e)
	}
	return true
})

if (formatNeeded.length > 0) {
	console.log("lint error: Format needed: " + formatNeeded.join(", "))
	process.exit(1)
}



