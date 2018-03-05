


module.exports = bench
bench.cpuSpeed = cpuSpeed

function bench(tests, next) {
	var i, tmp
	, keys = Object.keys(tests).reverse()
	, len = keys.length
	, times = []
	, samples = 7

	// warmup
	for (i = keys.length; i--; ) {
		measure(tests[keys[i]], 100)
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
		var i
		, result = {}
		for (i = len; i--; ) {
			result[keys[i]] = stat(times[i])
		}
		if (typeof next === "function") {
			next(null, result)
		}
	}
}

function measure(fn, time, next) {
	var now, i
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
		mean: mean|0,
		se: se,
		text: ((0|mean) + "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " ± " + se + "%"
	}
}

function cpuSpeed() {
	for (var i = 1e8, time = Date.now(); i--; );
	time = Date.now() - time
	return Math.round(1850 / time) / 10
}

