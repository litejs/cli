


module.exports = bench

function bench(tests, opts, next) {
	var i, test
	, keys = Object.keys(tests).reverse()
	, len = keys.length
	, times = []
	, samples = opts.samples || /* c8 ignore next */ 7
	, warmupTime = 0|((opts.warmup || /* c8 ignore next */ 2000)/len)

	// spread array of functions
	for (i = len; i--; ) {
		test = tests[keys[i]]
		if (typeof test !== "function" && Array.isArray(test.fns)) {
			keys.splice.apply(keys, [i, 1].concat(test.fns.map(bindFn).reverse()))
		}
		len = keys.length
	}
	function bindFn(fn) {
		var name = keys[i] + "." + fn.name
		tests[name] = test.run.bind(test, fn)
		return name
	}

	// warmup
	for (i = len; i--; ) {
		measure(tests[keys[i]], warmupTime)
		times[i] = Array(samples)
	}

	i = len

	runSync()

	function runSync() {
		if (i-->0 || samples-->0 && (i = len - 1)) {
			times[i][samples] = measure(tests[keys[i]], opts.sampleTime || /* c8 ignore next */ 500)
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
	if (global.gc) /* c8 ignore next */ global.gc()
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

