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
, assert = describe.assert

try {
	// chrome --js-flags="--allow-natives-syntax" test.html
	// node --allow-natives-syntax test.js
	if (describe.conf.v8 !== false) [ "GetOptimizationStatus", "HasFastProperties", "OptimizeFunctionOnNextCall"].map(function(name) {
		v8[name] = Function("fn", "return %" + name+ "(fn)")
	})
} catch(e) {}

assert.isFast = v8.HasFastProperties ? function(obj) {
	return this(v8.HasFastProperties(obj), "Should have fast properties")
} : assert.skip

assert.isNotFast = v8.HasFastProperties ? function(obj) {
	return this(!v8.HasFastProperties(obj), "Should not have fast properties")
} : assert.skip

assert.isOptimized = v8.GetOptimizationStatus ? function(fn, args, scope) {
	fn.apply(scope, args)
	fn.apply(scope, args)
	v8.OptimizeFunctionOnNextCall(fn)
	fn.apply(scope, args)
	var status = v8.GetOptimizationStatus(fn)
	, statusText = v8.statusTexts.filter(function(val, i) {
		return status & (1<<i)
	}).join(", ")

	return this(
		status & (16|32),
		"Status " + status + " = " + statusText
	)
} : assert.skip

