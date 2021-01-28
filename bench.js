


module.exports = bench
bench.cpuSpeed = cpuSpeed

function bench(tests, next) {
	var i
	, keys = Object.keys(tests).reverse()
	, len = keys.length
	, times = []
	, samples = 7
	, warmupTime = 0|(2000/len)

	// warmup
	for (i = len; i--; ) {
		measure(tests[keys[i]], warmupTime)
		times[i] = Array(samples)
	}

	i = len

	runSync()

	function runSync() {
		if (i-->0 || samples-->0 && (i = len - 1)) {
			times[i][samples] = measure(tests[keys[i]], 500)
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
			diff = Math.round((fastest - t.ops) / fastest * 100)
			t.rel = diff ? diff + "% slower" : "fastest"
		}
		if (typeof next === "function") {
			next(null, result)
		}
	}
}

function measure(fn, time, next) {
	var i
	, calls = 0
	, end = Date.now() + time
	, hr = process.hrtime()

	for (; true; ) {
		for (i = 1000; i--; ) fn()
		calls++
		if (Date.now() > end) {
			hr = process.hrtime(hr)
			return 1000 * calls / (hr[0] + hr[1]/1e9)
		}
	}
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

