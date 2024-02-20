

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

	, brCounts = []
	, brCov = 0
	, brTot = 0
	, brUncovered = []
	, brLines = []

	, lnCounts = []
	, lnCov = 0
	, lnTot = lnCounts.length = lines.length
	, ignoreNextRe = /^[&|\s]*\/\*[\s\w]*ignore next\s*\*\//


	lnCounts.fill(v8data[0].ranges[0].count, 0, lnTot)

	var br, branches = {}

	for (; i < l; ) {
		ranges = v8data[i++].ranges

		if (i > 1) {
			fillLines(ranges[0], true, fnLines, i - 2)
		}

		for (k = 1, ll = ranges.length; k < ll; ) {
			br = ranges[k++]
			if (!branches[br.startOffset]) {
				branches[br.startOffset] = br
				br.num = brTot++
			} else {
				branches[br.startOffset].count += br.count
			}
		}
	}
	Object.keys(branches).forEach(function(start) {
		var br = branches[start]
		fillLines(br, false, brLines, br.num)
	})

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
		zipJoin("BRDA:", brLines, brCounts),
		"end_of_record"
	].join("\n")
	, result = {
		name: name,
		coverage: pct(fnTot + brTot + lnTot, fnCov + brCov + lnCov),
		lcov: lcov,
		functions: {
			title: "Functions",
			total: fnTot,
			covered: fnCov,
			pct: pct(fnTot, fnCov),
			names: fnNames,
			counts: fnCounts,
			lines: fnLines
		},
		branches: {
			title: "Branches",
			total: brTot,
			covered: brCov,
			pct: pct(brTot, brCov),
			uncovered: brUncovered
		},
		lines: {
			title: "Lines",
			total: lnTot,
			covered: lnCov,
			pct: pct(lnTot, lnCov),
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

	function fillLines(range, isBlock, inLine, i) {
		var blockLines, match
		, start = range.startOffset
		, end = range.endOffset
		, blockSource = source.slice(start, end).replace(/\s*$/, "")
		, count = range.count || +ignoreNextRe.test(blockSource)
		if (count === 0) {
			count = +(source.slice(start - 50, start).replace(/^[^\/]+/, "").replace(ignoreNextRe, "").trim() === "")
		}

		if (isBlock) {
			fnCounts[i] = count
			fnNames[i] = v8data[i + 1].functionName || "<anon>"
			if (count > 0) fnCov++
			match = blockSource.match(/^[^{]+\{\n*/)
			if (match) {
				start += match[0].length
				blockSource = blockSource.replace(/^[^{]+\{\n*|\s*}[^}]*$/g, "")
			}
			// console.log("FILL", match, blockLines, range.count, JSON.stringify(blockSource))
		} else {
			brCounts[i] = "0," + i + "," + count
			if (count > 0 || ignoreNextRe.test(blockSource)) brCov++
			else {
				brUncovered.push([start, end, source.slice(start, end)])
			}
		}
		blockLines = blockSource.split("\n").length


		if (lastOffset > (lastOffset = start)) {
			offset = j = 0
		}
		for (; offset < lastOffset; offset += lines[j++].length + 1);
		inLine[i] = j
		if (isBlock === true || blockLines > 1) {
			lnCounts.fill(count, j, j + blockLines)
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


