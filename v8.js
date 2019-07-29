var v8 = {
	statusTexts: [
		"Unknown",
		"Function is optimized",
		"Function is not optimized",
		"Function is always optimized",
		"Function is never optimized",
		"Function is maybe deoptimized",
		"Function is optimized by TurboFan"
	]
}

try {
	// chrome --js-flags="--allow-natives-syntax" test.html
	// node --allow-natives-syntax test.js
	[ "GetOptimizationStatus", "HasFastProperties", "OptimizeFunctionOnNextCall"].map(function(name) {
		v8[name] = Function("fn", "return %" + name+ "(fn)")
	})
	v8.isNative = true
} catch(e) {}

var assert = require("./").describe.assert

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
	/*
	0 0 0 0 0 1 0 0 0 0 0 1
	┬ ┬ ┬ ┬ ┬ ┬ ┬ ┬ ┬ ┬ ┬ ┬
	│ │ │ │ │ │ │ │ │ │ │ └─╸ is function
	│ │ │ │ │ │ │ │ │ │ └───╸ is never optimized
	│ │ │ │ │ │ │ │ │ └─────╸ is always optimized
	│ │ │ │ │ │ │ │ └───────╸ is maybe deoptimized
	│ │ │ │ │ │ │ └─────────╸ is optimized
	│ │ │ │ │ │ └───────────╸ is optimized by TurboFan
	│ │ │ │ │ └─────────────╸ is interpreted
	│ │ │ │ └───────────────╸ is marked for optimization
	│ │ │ └─────────────────╸ is marked for concurrent optimization
	│ │ └───────────────────╸ is optimizing concurrently
	│ └─────────────────────╸ is executing
	└───────────────────────╸ topmost frame is turbo fanned */

	return this.ok(
		status == 1 || (status & 16 || status & 32),
		v8.statusTexts[status],
		_stackStart || isOptimized
	)
}


