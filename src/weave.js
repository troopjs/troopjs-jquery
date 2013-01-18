/**
 * TroopJS jquery/weave
 * @license MIT http://troopjs.mit-license.org/ © Mikael Karon mailto:mikael@karon.se
 */
/*global define:false */
define([ "require", "jquery", "troopjs-utils/getargs", "./destroy" ], function WeaveModule(parentRequire, $, getargs) {
	/*jshint strict:false, smarttabs:true, laxbreak:true, loopfunc:true */

	var UNDEFINED;
	var NULL = null;
	var ARRAY = Array;
	var ARRAY_PROTO = ARRAY.prototype;
	var JOIN = ARRAY_PROTO.join;
	var PUSH = ARRAY_PROTO.push;
	var $WHEN = $.when;
	var $DEFERRED = $.Deferred;
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

	/**
	 * Generic destroy handler.
	 * Simply makes sure that unweave has been called
	 */
	function onDestroy() {
		$(this).unweave();
	}

	$.expr[":"][WEAVE] = $.expr.createPseudo
		? $.expr.createPseudo(function (widgets) {
		if (widgets !== UNDEFINED) {
			widgets = RegExp($.map(getargs.call(widgets), function (widget) {
				return "^" + widget + "$";
			}).join("|"), "m");
		}

		return function (element) {
			var weave = $(element).attr(DATA_WEAVE);

			return weave === UNDEFINED
				? false
				: widgets === UNDEFINED
					? true
					: widgets.test(weave.split(/[\s,]+/).join("\n"));
		};
	})
		: function (element, index, match) {
		var weave = $(element).attr(DATA_WEAVE);

		return weave === UNDEFINED
			? false
			: match === UNDEFINED
				? true
				: RegExp($.map(getargs.call(match[3]), function (widget) {
			return "^" + widget + "$";
		}).join("|"), "m").test(weave.split(/[\s,]+/).join("\n"));
	};

	$.expr[":"][WOVEN] = $.expr.createPseudo
		? $.expr.createPseudo(function (widgets) {
		if (widgets !== UNDEFINED) {
			widgets = RegExp($.map(getargs.call(widgets), function (widget) {
				return "^" + widget + "@\\d+";
			}).join("|"), "m");
		}

		return function (element) {
			var woven = $(element).attr(DATA_WOVEN);

			return woven === UNDEFINED
				? false
				: widgets === UNDEFINED
					? true
					: widgets.test(woven.split(/[\s,]+/).join("\n"));
		};
	})
		: function (element, index, match) {
		var woven = $(element).attr(DATA_WOVEN);

		return woven === UNDEFINED
			? false
			: match === UNDEFINED
				? true
				: RegExp($.map(getargs.call(match[3]), function (widget) {
			return "^" + widget + "@\\d+";
		}).join("|"), "m").test(woven.split(/[\s,]+/).join("\n"));
	};

	$.fn[WEAVE] = function weave(/* arg, arg, arg */) {
		var widgets = [];
		var i = 0;
		var $elements = $(this);
		var arg = arguments;

		$elements
			// Reduce to only elements that can be woven
			.filter(SELECTOR_WEAVE)
			// Iterate
			.each(function elementIterator(index, element) {
				// Defer weave
				$DEFERRED(function deferredWeave(dfdWeave) {
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
						PUSH.call(pending, dfdWeave);

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
							$DEFERRED(function deferredWidget(dfdWidget) {
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
									// Convert args using getargs
									args = getargs.call(args);

									// Append typed values from args to argv
									for (k = 0, kMax = args.length, l = argv.length; k < kMax; k++, l++) {
										// Get value
										value = args[k];

										// Get value from $data or fall back to pure value
										argv[l] = value in $data
											? $data[value]
											: value;
									}
								}

								// Require module
								parentRequire([ name ], function required(Widget) {
									// Instantiate widget (with argv)
									var widget = Widget.apply(Widget, argv);

									// Start widget
									widget.start().then(function resolve() {
										dfdWidget.resolve(widget);
									}, dfdWidget.reject, dfdWidget.notify);
								});
							});
						}

						// Slice out widgets woven for this element
						$WHEN.apply($, widgets.slice(mark, i)).then(dfdWeave.resolve, dfdWeave.reject, dfdWeave.notify);

					}, dfdWeave.reject, dfdWeave.notify);
				});
			});

		// Return compacted combined promise
		return $DEFERRED(function deferredWeave(dfdWeave) {
			$WHEN.apply($, widgets).then(function resolve() {
				dfdWeave.resolve(arguments);
			}, dfdWeave.reject, dfdWeave.progress);
		}).promise();
	};

	$.fn[UNWEAVE] = function unweave() {
		var widgets = [];
		var i = 0;
		var $elements = $(this);

		$elements
			// Reduce to only elements that can be unwoven
			.filter(SELECTOR_UNWEAVE)
			// Iterate
			.each(function elementIterator(index, element) {
				// Defer unweave
				$DEFERRED(function deferredUnweave(dfdUnweave) {
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
						PUSH.call(pending, dfdUnweave);

						// Remove WOVEN data
						delete $data[WOVEN];

						$element
							// Remove DATA_WOVEN attribute
							.removeAttr(DATA_WOVEN);

						// Somewhat safe(r) iterator over woven
						while ((widget = woven.shift()) !== UNDEFINED) {
							// Defer widget
							$DEFERRED(function deferredWidget(dfdWidget) {
								// Add to unwoven and pending
								widgets[i++] = widget.stop().then(function resolve() {
									dfdWidget.resolve(widget);
								}, dfdWidget.reject, dfdWidget.notify);
							});
						}

						// Slice out widgets unwoven for this element
						$WHEN.apply($, widgets.slice(mark, i)).then(dfdUnweave.resolve, dfdUnweave.reject, dfdUnweave.notify);
					});
				});
			});

		// Return compacted combined promise
		return $DEFERRED(function deferredUnweave(dfdUnweave) {
			$WHEN.apply($, widgets).then(function resolve() {
				dfdUnweave.resolve(arguments);
			}, dfdUnweave.reject, dfdUnweave.progress);
		}).promise();
	};

	$.fn[WOVEN] = function woven(/* arg, arg */) {
		var result = [];
		var widgets = arguments.length > 0
			? RegExp($.map(arguments, function (widget) {
				return "^" + widget + "$";
			}).join("|"), "m")
			: UNDEFINED;

		$(this).each(function elementIterator(index, element) {
			if (!$.hasData(element)) {
				return;
			}

			PUSH.apply(result, widgets === UNDEFINED
				? $.data(element, WOVEN)
				: $.map($.data(element, WOVEN), function (woven) {
					return widgets.test(woven.displayName)
						? woven
						: UNDEFINED;
				}));
		});

		return result;
	};
});
