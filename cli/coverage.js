

this.fileCoverage = fileCoverage
this.reportTable = function(results) {
	var i, r
	, nameLen = 0
	, out = ""
	for (i = results.length; i--; ) {
		if (results[i].name.length > nameLen) nameLen = results[i].name.length
	}

	out += [
		"---".padEnd(nameLen),
		"Coverage",
		"Lines".padStart(16),
		"Functions".padStart(16),
		"Branches".padStart(16)
	].join(" ") + "\n"
	for (i = 0; (r = results[i++]); ) {
		out += [
			r.name.padEnd(nameLen),
			(r.coverage+"%").padStart(8),
			nums(r.lines),
			nums(r.functions),
			nums(r.branches)
		].join(" ") + "\n"
	}
	return out
	function nums(obj) {
		return ("[" + obj.covered + "/" + obj.total + "]").padStart(16)

	}
}
this.reportDiff = function() {
	// child.execSync("git diff --no-index --color -- " + snapFile + " -", { input: actual, encoding: "utf8" })
}

function fileCoverage(name, source, v8data) {
	var lines = source.split("\n")
	, l = v8data.length
	, i = 0
	, j = 0
	, ll
	, k
	, ranges
	, offset = 0
	, lastOffset = 0

	, fnCounts = []
	, fnCov = 0
	, fnTot = l - 1
	, fnNames = []
	, fnLines = []

	, brCov = 0
	, brTot = 0

	, lnCounts = []
	, lnCov = 0
	, lnTot = lnCounts.length = lines.length

	lnCounts.fill(v8data[0].ranges[0].count, 0, lnTot)

	for (; i < l; ) {
		ranges = v8data[i++].ranges

		if (i > 1) {
			fillLines(ranges[0])

			fnNames[i - 2] = v8data[i - 1].functionName || "<anon>"
			fnCounts[i - 2] = ranges[0].count
			fnLines[i - 2] = j
		}

		for (k = 1, ll = ranges.length; k < ll; ) {
			fillLines(ranges[k])
			if (ranges[k++].count > 0) brCov++
		}
		brTot += ll - 1
	}

	for (j = 0; j < fnTot; ) if (fnCounts[j++] > 0) fnCov++
	for (j = 0; j < lnTot; ) if (lnCounts[j++] > 0) lnCov++

	var lcov = [
		"TN:",
		"SF:" + name,
		zipJoin("FN:", fnLines, fnNames),
		"FNF:" + fnTot,
		"FNH:" + fnCov,
		zipJoin("FNDA:", fnCounts, fnNames),
		zipJoin("DA:", lnCounts),
		"LF:" + lnTot,
		"LH:" + lnCov,
		"BRF:" + brTot,
		"BRH:" + brCov,
		"end_of_record"
	].join("\n")
	, result = {
		name: name,
		coverage: pct(fnTot + brTot + lnTot, fnCov + brCov + lnCov),
		lcov: lcov,
		functions: {
			title: "Functions",
			pct: pct(fnTot, fnCov),
			total: fnTot,
			covered: fnCov,
			names: fnNames,
			counts: fnCounts,
			lines: fnLines
		},
		branches: {
			title: "Branches",
			pct: pct(brTot, brCov),
			total: brTot,
			covered: brCov
		},
		lines: {
			title: "Lines",
			pct: pct(lnTot, lnCov),
			total: lnTot,
			covered: lnCov,
			counts: lnCounts
		}
	}
	result.text = ["lines", "functions", "branches"].map(summary).join(", ")
	return result

	function pct(total, covered) {
		return total === 0 ? 100 : Math.floor(100 * covered / total)
	}
	function summary(key) {
		var obj = result[key]
		return obj.title + " " + obj.pct + "% [" + obj.covered + "/" + obj.total + "]"
	}

	function fillLines(range) {
		var blockSource = source.slice(range.startOffset, range.endOffset).replace(/(\s*},?)?\s*$/, "")
		, blockLines = blockSource.split("\n").length


		if (lastOffset > (lastOffset = range.startOffset)) {
			offset = j = 0
		}
		for (; offset < lastOffset; offset += lines[j++].length + 1);
		//console.log("FILL", blockLines > 1, range.count, j, j + blockLines, JSON.stringify(blockSource))
		if (blockLines > 1) {
			lnCounts.fill(range.count, j, j + blockLines - 1)
		}
	}

	function zipJoin(prefix, values, names) {
		return values.map(
			names ?
			function(value, i) { return prefix + value + "," + names[i] } :
			function(value, i) { return prefix + (i + 1) + "," + value }
		).join("\n")
	}
}


