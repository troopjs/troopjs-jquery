/*!
 * TroopJS jQuery weave plug-in
 * @license TroopJS Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
/*jshint strict:false, smarttabs:true, laxbreak:true, loopfunc:true */
/*global define:true */
define([ "jquery" ], function WeaveModule($) {
    var UNDEFINED;
	var NULL = null;
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
	var WEAVING = "weaving";
	var PENDING = "pending";
	var DESTROY = "destroy";
	var DATA = "data-";
	var DATA_WEAVE = DATA + WEAVE;
	var DATA_WOVEN = DATA + WOVEN;
	var DATA_WEAVING = DATA + WEAVING;
	var SELECTOR_WEAVE = "[" + DATA_WEAVE + "]";
	var SELECTOR_UNWEAVE = "[" + DATA_WEAVING + "],[" + DATA_WOVEN + "]";
	var RE_SEPARATOR = /\s*,\s*/;
	var RE_STRING = /^(["']).*\1$/;
	var RE_DIGIT = /^\d+$/;
	var RE_BOOLEAN = /^(?:false|true)$/i;
	var RE_BOOLEAN_TRUE = /^true$/i;

	/**
	 * Generic destroy handler.
	 * Simply makes sure that unweave has been called
	 */
	function onDestroy() {
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
				// Defer weave
				$.Deferred(function deferredWeave(dfdWeave) {
					var $element = $(element);
					var $data = $element.data();
					var weave = $data[WEAVE] = $element.attr(DATA_WEAVE) || "";
					var woven = $data[WOVEN] || ($data[WOVEN] = []);
					var pending = $data[PENDING] || ($data[PENDING] = []);

					// Link deferred
					dfdWeave.done(function doneWeave() {
						$element
							// Remove DATA_WEAVING
							.removeAttr(DATA_WEAVING)
							// Set DATA_WOVEN with full names
							.attr(DATA_WOVEN, JOIN.call(arguments, " "));
					});

					// Wait for all pending deferred
					$WHEN.apply($, pending).then(function donePending() {
						var re = /[\s,]*([\w_\-\/\.]+)(?:\(([^\)]+)\))?/g;
						var mark = i;
						var j = 0;
						var matches;

						// Push dfdWeave on pending to signify we're starting a new task
						pending.push(dfdWeave);

						$element
							// Make sure to remove DATA_WEAVE (so we don't try processing this again)
							.removeAttr(DATA_WEAVE)
							// Set DATA_WEAVING (so that unweave can pick this up)
							.attr(DATA_WEAVING, weave)
							// Bind destroy event
							.bind(DESTROY, onDestroy);

						// Iterate woven (while RE_WEAVE matches)
						while ((matches = re.exec(weave)) !== NULL) {
							// Defer widget
							$.Deferred(function deferredWidget(dfdWidget) {
								var _j = j++; // store _j before we increment
								var k;
								var l;
								var kMax;
								var value;

								// Add to widgets
								widgets[i++] = dfdWidget;

								// Link deferred
								dfdWidget.then(function doneWidget(widget) {
									woven[_j] = widget;
								}, dfdWeave.reject, dfdWeave.notify);

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

								// Require module
								require([ name ], function required(Widget) {
									// Defer start
									$.Deferred(function deferredStart(dfdStart) {
										// Constructed and initialized instance
										var widget = Widget.apply(Widget, argv);

										// Link deferred
										dfdStart.then(function doneStart() {
											dfdWidget.resolve(widget);
										}, dfdWidget.reject, dfdWidget.notify);

										// Start
										widget.start(dfdStart);
									});
								});
							});
						}

						// Slice out widgets woven for this element
						$WHEN.apply($, widgets.slice(mark, i)).then(dfdWeave.resolve, dfdWeave.reject, dfdWeave.notify);

					}, dfdWeave.reject, dfdWeave.notify);
				});
			});

		// When all widgets are resolved, resolve original deferred
		$WHEN.apply($, widgets).then(deferred.resolve, deferred.reject, deferred.notify);

		return $elements;
	};


	$.fn[UNWEAVE] = function unweave(deferred) {
		var widgets = [];
		var i = 0;
		var $elements = $(this);

		// Create default deferred if none was passed
		deferred = deferred || $.Deferred();

		$elements
			// Reduce to only elements that can be unwoven
			.filter(SELECTOR_UNWEAVE)
			// Iterate
			.each(function elementIterator(index, element) {
				// Defer unweave
				$.Deferred(function deferredUnweave(dfdUnweave) {
					var $element = $(element);
					var $data = $element.data();
					var pending = $data[PENDING] || ($data[PENDING] = []);
					var woven = $data[WOVEN] || [];

					// Link deferred
					dfdUnweave.done(function doneUnweave() {
						$element
							// Copy weave data to data-weave attribute
							.attr(DATA_WEAVE, $data[WEAVE])
							// Make sure to clean the destroy event handler
							.unbind(DESTROY, onDestroy);

						// Remove data fore WEAVE
						delete $data[WEAVE];
					});

					// Wait for all pending deferred
					$WHEN.apply($, pending).done(function donePending() {
						var mark = i;
						var widget;

						// Push dfdUnweave on pending to signify we're starting a new task
						pending.push(dfdUnweave);

						// Remove WOVEN data
						delete $data[WOVEN];

						$element
							// Remove DATA_WOVEN attribute
							.removeAttr(DATA_WOVEN);

						// Somewhat safe(r) iterator over woven
						while ((widget = woven.shift()) !== UNDEFINED) {
							// Defer widget
							$.Deferred(function deferredWidget(dfdWidget) {
								// Add to unwoven and pending
								widgets[i++] = dfdWidget;

								// $.Deferred stop
								$.Deferred(function deferredStop(dfdStop) {
									// Link deferred
									dfdStop.then(function doneStop() {
										dfdWidget.resolve(widget);
									}, dfdWidget.reject, dfdWidget.notify);

									// Stop
									widget.stop(dfdStop);
								});
							});
						}

						// Slice out widgets unwoven for this element
						$WHEN.apply($, widgets.slice(mark, i)).then(dfdUnweave.resolve, dfdUnweave.reject, dfdUnweave.notify);
					});
				});
			});

		// When all deferred are resolved, resolve original deferred
		$WHEN.apply($, widgets).then(deferred.resolve, deferred.reject, deferred.notify);

		return $elements;
	};
});