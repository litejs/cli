var v8 = {
	statusTexts: [
		"IsFunction",
		"NeverOptimize",
		"AlwaysOptimize",
		"MaybeDeopted",
		"Optimized",
		"TurboFanned",
		"Interpreted",
		"MarkedForOptimization",
		"MarkedForConcurrentOptimization",
		"OptimizingConcurrently",
		"IsExecuting",
		"TopmostFrameIsTurboFanned",
		"LiteMode",
		"MarkedForDeoptimization"
	]
}

var assert = describe.assert

try {
	// chrome --js-flags="--allow-natives-syntax" test.html
	// node --allow-natives-syntax test.js
	[ "GetOptimizationStatus", "HasFastProperties", "OptimizeFunctionOnNextCall"].map(function(name) {
		v8[name] = describe.conf.v8 !== false && Function("fn", "return %" + name+ "(fn)")
	})
	v8.isNative = true
} catch(e) {}

assert.isFast = !v8.HasFastProperties ? assert.skip : function isFast(obj, a, b, _stackStart) {
	return this.ok(
		v8.HasFastProperties(obj),
		"Should have fast properties",
		_stackStart || isFast
	)
}

assert.isNotFast = !v8.HasFastProperties ? assert.skip : function isNotFast(obj, a, b, _stackStart) {
	return this.ok(
		!v8.HasFastProperties(obj),
		"Should not have fast properties",
		_stackStart || isNotFast
	)
}

assert.isOptimized = !v8.GetOptimizationStatus ? assert.skip : function isOptimized(fn, args, scope, _stackStart) {
	fn.apply(scope, args)
	fn.apply(scope, args)
	v8.OptimizeFunctionOnNextCall(fn)
	fn.apply(scope, args)
	var status = v8.GetOptimizationStatus(fn)
	, statusText = v8.statusTexts.filter(function(val, i) {
		return status & (1<<i)
	}).join(", ")

	return this.ok(
		(status & 16 || status & 32),
		"Status " + status + " = " + statusText
	)
}


