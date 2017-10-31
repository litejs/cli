#!/usr/bin/env node

var fs = require("fs")
, child = require("child_process")
, opts = {}

function getopts(args, i, opts) {
	for (var arg; arg = args[i++]; ) {
		switch (arg) {
		case "-b":
		case "--banner":
			opts.banner = args[i++]
			break;
		default:
			if (arg.charAt(0) == "-") {
				args.splice.apply(
					args,
					[i, 0].concat(arg.replace(/\w(?!$)/g,"$& " + args[i] + " -").split(" "))
				)
			} else if (!opts.cmd) {
				opts.cmd = arg
			} else {
				opts.file = arg
			}
		}
	}
}


switch (process.argv[2]) {
case "init":
	getopts(process.argv.slice(0), 2, opts)
	require("./init")(opts)
	break;
case "build":
	require("./build").execute(process.argv, 3)
	break;
}



