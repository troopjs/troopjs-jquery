/*!
 * TroopJS jQuery weave plug-in
 * @license TroopJS 0.0.1 Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
define([ "jquery", "deferred" ], function WeaveModule($, Deferred) {
	var UNDEFINED = undefined;
	var TRUE = true;
	var ARRAY = Array;
	var ARRAY_PROTO = ARRAY.prototype;
	var JOIN = ARRAY_PROTO.join;
	var WHEN = $.when;
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
		var required = [];
		var i = 0;
		var $elements = $(this);

		// Make arguments into a real array
		var argx  = ARRAY.apply(ARRAY_PROTO, arguments);

		// Update deferred to the last argument
		var deferred = argx.pop();

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
					// Add deferred to required array
					Deferred(function deferedRequire(dfd) {
						var _j = j++; // store _j before we increment
						var k;
						var l;
						var kMax;
						var value;

						// Store on required
						required[i++] = dfd;

						// Add done handler to register
						dfd.done(function doneRequire(widget) {
							widgets[_j] = widget;
						});

						// Get widget name
						var name = matches[1];

						// Set initial argv
						var argv = [ $element, name ];

						// Append values from argx to argv
						for (k = 0, kMax = argx.length, l = argv.length; k < kMax; k++, l++) {
							argv[l] = argx[k];
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
							// Resolve with constructed, bound and initialized instance
							var widget = Widget
								.apply(Widget, argv)
								.bind(DESTROY, onDestroy)
								.initialize();

							Deferred(function deferredStarted(dfdStarted) {
								Deferred(function deferredStarting(dfdStarting) {
									widget.state("starting", dfdStarting);
								})
								.done(function doneStarting() {
									widget.state("started", dfdStarted);
								});
							})
							.done(function doneStarted() {
								dfd.resolve(widget);
							});
						});
					});
				}

				// Slice out widgets woven for this element
				WHEN.apply($, required.slice(mark, i)).done(function doneRequired() {
					// Set DATA_WOVEN attribute
					$element.attr(DATA_WOVEN, JOIN.call(arguments, " "));
				});
			});

		if (deferred) {
			// When all deferred are resolved, resolve original deferred
			WHEN.apply($, required).then(deferred.resolve, deferred.reject);
		}

		return $elements;
	};

	$.fn[UNWEAVE] = function unweave() {
		return $(this)
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
					// State and finalize TODO add a wrapping deferred for the whole unweave
					Deferred(function deferredStopped(dfdStopped) {
						Deferred(function deferredStopping(dfdStopping) {
							widget.state("stopping", dfdStopping);
						})
						.done(function doneStopping() {
							widget.state("stopped", dfdStopped);
						});
					})
					.done(function doneStopped() {
						widget.finalize();
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
	};
});