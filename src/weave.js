/*!
 * TroopJS jQuery weave plug-in
 * @license TroopJS Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
define([ "jquery" ], function WeaveModule($) {
	var UNDEFINED = undefined;
	var ARRAY = Array;
	var FUNCTION = Function;
	var ARRAY_PROTO = ARRAY.prototype;
	var JOIN = ARRAY_PROTO.join;
	var POP = ARRAY_PROTO.pop;
	var $WHEN = $.when;
	var THEN = "then";
	var WEAVE = "weave";
	var UNWEAVE = "unweave";
	var WOVEN = "woven";
	var PENDING = "pending";
	var DESTROY = "destroy";
	var DATA_WEAVE = "data-" + WEAVE;
	var DATA_WOVEN = "data-" + WOVEN;
	var SELECTOR_WEAVE = "[" + DATA_WEAVE + "]";
	var SELECTOR_WOVEN = "[" + DATA_WOVEN + "]";
	var RE_SEPARATOR = /\s*,\s*/;
	var RE_STRING = /^(["']).*\1$/;
	var RE_DIGIT = /^\d+$/;
	var RE_BOOLEAN = /^(?:false|true)$/i;
	var RE_BOOLEAN_TRUE = /^true$/i;

	/**
	 * Generic destroy handler.
	 * Simply makes sure that unweave has been called
	 * @param $event
	 */
	function onDestroy($event) {
		$(this).unweave();
	}

	$.fn[WEAVE] = function weave(/* arg, arg, arg, deferred*/) {
		var widgets = [];
		var i = 0;
		var $elements = $(this);
		var arg = arguments;
		var argc = arg.length;

		// If deferred not a true Deferred, make it so
		var deferred = argc > 0 && arg[argc - 1][THEN] instanceof FUNCTION
			? POP.call(arg)
			: $.Deferred();

		$elements
			// Reduce to only elements that can be woven
			.filter(SELECTOR_WEAVE)
			// Iterate
			.each(function elementIterator(index, element) {
				var $element = $(element);
				var $data = $element.data();
				var weave = $data[WEAVE] = $element.attr(DATA_WEAVE) || "";
				var woven = $data[WOVEN] = [];
				var pending = $data[PENDING] || ($data[PENDING] = []);
				var re = /[\s,]*([\w_\-\/]+)(?:\(([^\)]+)\))?/g;
				var j = 0;
				var matches;

				// Wait for all pending deferred
				$WHEN.apply($, pending).done(function doneRequired() {
					$element
						// Make sure to remove DATA_WEAVE (so we don't try processing this again)
						.removeAttr(DATA_WEAVE)
						// Bind destroy event
						.bind(DESTROY, onDestroy);

					// Iterate woven (while the RE_WEAVE matches)
					while (matches = re.exec(weave)) {
						// Defer weave
						$.Deferred(function deferredRequire(dfdWeave) {
							var _j = j++; // store _j before we increment
							var k;
							var l;
							var kMax;
							var value;

							// Add to widgets and pending
							widgets[i++] = pending[pending.length] = dfdWeave;

							// Link deferred
							dfdWeave.then(function doneRequire(widget) {
								woven[_j] = widget;
							}, deferred.reject, deferred.notify);

							// Get widget name
							var name = matches[1];

							// Set initial argv
							var argv = [ $element, name ];

							// Append values from arg to argv
							for (k = 0, kMax = arg.length, l = argv.length; k < kMax; k++, l++) {
								argv[l] = arg[k];
							}

							// Get widget args
							var args = matches[2];

							// Any widget arguments
							if (args !== UNDEFINED) {
								// Convert args to array
								args = args.split(RE_SEPARATOR);

								// Append typed values from args to argv
								for (k = 0, kMax = args.length, l = argv.length; k < kMax; k++, l++) {
									// Get value
									value = args[k];

									if (value in $data) {
										argv[l] = $data[value];
									} else if (RE_STRING.test(value)) {
										argv[l] = value.slice(1, -1);
									} else if (RE_DIGIT.test(value)) {
										argv[l] = Number(value);
									} else if (RE_BOOLEAN.test(value)) {
										argv[l] = RE_BOOLEAN_TRUE.test(value);
									} else {
										argv[l] = value;
									}
								}
							}

							require([ name ], function required(Widget) {
								// Defer require
								$.Deferred(function deferredStart(dfdRequire) {
									// Constructed and initialized instance
									var widget = Widget.apply(Widget, argv);

									// Link deferred
									dfdRequire.then(function doneStart() {
										dfdWeave.resolve(widget);
									}, dfdWeave.reject, dfdWeave.notify);

									// Start
									widget.start(dfdRequire);
								});
							});
						});
					}

					// Slice out woven woven for this element
					$WHEN.apply($, pending).done(function donePending() {
						// Set DATA_WOVEN attribute
						$element.attr(DATA_WOVEN, JOIN.call(arguments, " "));
					});
				});
			});

		// When all deferred are resolved, resolve original deferred
		$WHEN.apply($, widgets).then(deferred.resolve, deferred.reject, deferred.notify);

		return $elements;
	};

	$.fn[UNWEAVE] = function unweave(deferred) {
		var unwoven = [];
		var i = 0;
		var $elements = $(this);

		// Create default deferred if none was passed
		deferred = deferred || $.Deferred();

		$elements
			// Reduce to only elements that are woven
			.filter(SELECTOR_WOVEN)
			// Iterate
			.each(function elementIterator(index, element) {
				var $element = $(element);
				var $data = $element.data();
				var pending = $data[PENDING];
				var woven = $data[WOVEN];
				var widget;

				$WHEN.apply($, pending).done(function donePending() {
					// Remove WOVEN data
					delete $data[WOVEN];

					$element
						// Remove DATA_WOVEN attribute
						.removeAttr(DATA_WOVEN);

					// Somewhat safe(r) iterator over woven
					while (widget = woven.shift()) {
						// $.Deferred stop
						$.Deferred(function deferredStop(dfdStop) {
							// Add to unwoven and pending
							unwoven[i++] = pending[pending.length] = dfdStop;

							widget.stop(dfdStop);
						});
					}

					$element
						// Copy weave data to data-weave attribute
						.attr(DATA_WEAVE, $data[WEAVE])
						// Make sure to clean the destroy event handler
						.unbind(DESTROY, onDestroy);

					// Remove data fore WEAVE
					delete $data[WEAVE];
				});
			});

		if (deferred) {
			// When all deferred are resolved, resolve original deferred
			$WHEN.apply($, unwoven).then(deferred.resolve, deferred.reject, deferred.notify);
		}

		return $elements;
	};
});