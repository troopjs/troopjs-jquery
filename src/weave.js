/*!
 * TroopJS jQuery weave plug-in
 * @license TroopJS 0.0.1 Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
define([ "jquery" ], function WeaveModule($) {
	var UNDEFINED = undefined;
	var TRUE = true;
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
	var DESTROY = "destroy";
	var DATA_WEAVE = "data-" + WEAVE;
	var DATA_WOVEN = "data-" + WOVEN;
	var SELECTOR_WEAVE = "[" + DATA_WEAVE + "]";
	var SELECTOR_WOVEN = "[" + DATA_WOVEN + "]";
	var RE_SEPARATOR = /\s*,\s*/;
	var RE_STRING = /^(["']).*\1$/;
	var RE_DIGIT = /^\d+$/;
	var RE_BOOLEAN = /^false|true$/i;

	/**
	 * Generic destroy handler.
	 * Simply makes sure that unweave has been called
	 * @param $event
	 */
	function onDestroy($event) {
		$(this).unweave();
	}

	$.fn[WEAVE] = function weave(/* arg, arg, arg, deferred*/) {
		var woven = [];
		var i = 0;
		var $elements = $(this);

		var arg = arguments;
		var argc = arg.length;

		// Check if the last argument looks like a deferred, and in that case set it
		var deferred = argc > 0 && arg[argc - 1][THEN] instanceof FUNCTION
			? POP.call(arg)
			: UNDEFINED;

		$elements
			// Reduce to only elements that can be woven
			.filter(SELECTOR_WEAVE)
			// Iterate
			.each(function elementIterator(index, element) {
				var $element = $(element);
				var $data = $element.data();
				var weave = $element.attr(DATA_WEAVE) || "";
				var re = /[\s,]*([\w_\-\/]+)(?:\(([^\)]+)\))?/g;
				var widgets = [];
				var mark = i;
				var j = 0;
				var matches;

				$element
					// Store DATA_WEAVE attribute as WEAVE
					.data(WEAVE, weave)
					// Store widgets array as WOVEN
					.data(WOVEN, widgets)
					// Make sure to remove DATA_WEAVE (so we don't try processing this again)
					.removeAttr(DATA_WEAVE);

				// Iterate widgets (while the RE_WEAVE matches)
				while (matches = re.exec(weave)) {
					// Add deferred to woven array
					$.Deferred(function deferedRequire(dfd) {
						var _j = j++; // store _j before we increment
						var k;
						var l;
						var kMax;
						var value;

						// Store on woven
						woven[i++] = dfd;

						// Add done handler to register
						dfd.done(function doneRequire(widget) {
							widgets[_j] = widget;
						});

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
									argv[l] = value === TRUE;
								} else {
									argv[l] = value;
								}
							}
						}

						require([ name ], function required(Widget) {
							// Resolve with constructed and initialized instance
							var widget = Widget
								.apply(Widget, argv)
								.bind(DESTROY, onDestroy);

							// Start
							$.Deferred(function deferredStart(dfdStart) {
								widget.start(dfdStart);
							})
							.done(function doneStart() {
								dfd.resolve(widget);
							})
							.fail(dfd.reject);
						});
					});
				}

				// Slice out widgets woven for this element
				$WHEN.apply($, woven.slice(mark, i)).done(function doneRequired() {
					// Set DATA_WOVEN attribute
					$element.attr(DATA_WOVEN, JOIN.call(arguments, " "));
				});
			});

		if (deferred) {
			// When all deferred are resolved, resolve original deferred
			$WHEN.apply($, woven).then(deferred.resolve, deferred.reject);
		}

		return $elements;
	};

	$.fn[UNWEAVE] = function unweave(deferred) {
		var unwoven = [];
		var i = 0;
		var $elements = $(this);

		$elements
			// Reduce to only elements that are woven
			.filter(SELECTOR_WOVEN)
			// Iterate
			.each(function elementIterator(index, element) {
				var $element = $(element);
				var widgets = $element.data(WOVEN);
				var widget;

				$element
					// Remove WOVEN data
					.removeData(WOVEN)
					// Remove DATA_WOVEN attribute
					.removeAttr(DATA_WOVEN);

				// Somewhat safe(r) iterator over widgets
				while (widget = widgets.shift()) {
					// $.Deferred stop
					$.Deferred(function deferredStop(dfdStop) {
						// Store on onwoven
						unwoven[i++] = dfdStop;

						widget.stop(dfdStop);
					});
				}

				$element
					// Copy woven data to data-weave attribute
					.attr(DATA_WEAVE, $element.data(WEAVE))
					// Remove data fore WEAVE
					.removeData(WEAVE)
					// Make sure to clean the destroy event handler
					.unbind(DESTROY, onDestroy);
			});

		if (deferred) {
			// When all deferred are resolved, resolve original deferred
			$WHEN.apply($, unwoven).then(deferred.resolve, deferred.reject);
		}

		return $elements;
	};
});