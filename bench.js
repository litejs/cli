


module.exports = bench
bench.cpuSpeed = cpuSpeed

function bench(tests, opts, next) {
	var i
	, keys = Object.keys(tests).reverse()
	, len = keys.length
	, times = []
	, samples = opts.samples || /* c8 ignore next */ 7
	, warmupTime = 0|((opts.warmup || /* c8 ignore next */ 2000)/len)

	// warmup
	for (i = len; i--; ) {
		measure(tests[keys[i]], warmupTime)
		times[i] = Array(samples)
	}

	i = len

	runSync()

	function runSync() {
		if (i-->0 || samples-->0 && (i = len - 1)) {
			times[i][samples] = measure(tests[keys[i]], opts["sample-time"] || /* c8 ignore next */ 500)
			process.nextTick(runSync)
		} else {
			respond()
		}
	}

	function respond() {
		var diff, fastest, i, t
		, result = {}
		for (i = len; i--; ) {
			t = result[keys[i]] = stat(times[i])
			if (!fastest || t.ops > fastest) {
				fastest = t.ops
			}
		}
		for (i = len; (t = result[keys[--i]]); ) {
			diff = t.diff = Math.round((fastest - t.ops) / fastest * 100)
			t.rel = diff ? diff + "% slower" : "fastest"
		}
		/* c8 ignore else */
		if (typeof next === "function") {
			next(null, result)
		}
	}
}

function measure(fn, time) {
	var i, hr
	, count = 0
	, ms = 0
	/* c8 ignore next */
	if (global.gc) global.gc()
	for (; ms < time; ) {
		count++
		hr = process.hrtime()
		for (i = 1000; i--; ) fn()
		hr = process.hrtime(hr)
		ms += hr[0]*1e3 + hr[1]/1e6
	}
	return 1e6 * count / ms
}

function stat(arr) {
	var i, t
	, mean = 0
	, se = 0
	, len = arr.length

	for (i = len; i--; ) {
		mean += arr[i]
	}
	mean /= len
	for (i = len; i--; ) {
		t = arr[i] - mean
		se += t * t
	}
	se = ~~(1000 * (Math.sqrt(se / (len - 1)) / Math.sqrt(len)) / mean) / 10
	return {
		ops: mean|0,
		se: se,
		text: ((0|mean) + "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " ± " + se + "%"
	}
}

function cpuSpeed() {
	for (var i = 1e8, time = Date.now(); i--; );
	time = Date.now() - time
	return Math.round(1850 / time) / 10
}

