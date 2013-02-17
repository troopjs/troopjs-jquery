/**
 * TroopJS jquery/weave
 * @license MIT http://troopjs.mit-license.org/ © Mikael Karon mailto:mikael@karon.se
 */
/*global define:false */
define([ "require", "jquery", "when", "troopjs-utils/getargs", "./destroy", "poly/array" ], function WeaveModule(parentRequire, $, when, getargs) {
	/*jshint strict:false, laxbreak:true, newcap:false */

	var UNDEFINED;
	var ARRAY_PROTO = Array.prototype;
	var ARRAY_SLICE = ARRAY_PROTO.slice;
	var ARRAY_MAP = ARRAY_PROTO.map;
	var $FN = $.fn;
	var $EXPR = $.expr;
	var $CREATEPSEUDO = $EXPR.createPseudo;
	var WEAVE = "weave";
	var UNWEAVE = "unweave";
	var WOVEN = "woven";
	var DESTROY = "destroy";
	var LENGTH = "length";
	var DATA = "data-";
	var DATA_WEAVE = DATA + WEAVE;
	var DATA_WOVEN = DATA + WOVEN;
	var SELECTOR_WEAVE = "[" + DATA_WEAVE + "]";
	var SELECTOR_UNWEAVE = "[" + DATA_WOVEN + "]";
	var RE_SEPARATOR = /[\s,]+/;

	/**
	 * Generic destroy handler.
	 * Simply makes sure that unweave has been called
	 */
	function onDestroy() {
		$(this).unweave();
	}

	/**
	 * :weave expression
	 * @type {*}
	 */
	$EXPR[":"][WEAVE] = $CREATEPSEUDO
		// If we have jQuery >= 1.8 we want to use .createPseudo
		? $CREATEPSEUDO(function (widgets) {
			// If have widgets to filter by
			if (widgets !== UNDEFINED) {
				// Create regexp from widgets
				widgets = RegExp(getargs.call(widgets).map(function (widget) {
					return "^" + widget + "$";
				}).join("|"), "m");

				// Return result function
				return function (element) {
					// Get weave attribute
					var weave = $(element).attr(DATA_WEAVE);

					// Check that weave is not UNDEFINED, and that widgets test against a processed weave
					return weave !== UNDEFINED && widgets.test(weave.replace(RE_SEPARATOR, "\n"));
				};
			}
			// Otherwise an optimized version can be used
			else {
				return function (element) {
					return $(element).attr(DATA_WEAVE) !== UNDEFINED;
				};
			}
		})
		// Otherwise fall back to legacy
		: function (element, index, match) {
			var weave = $(element).attr(DATA_WEAVE);

			return weave === UNDEFINED
				? false
				: match === UNDEFINED
					? true
					: RegExp(getargs.call(match[3]).map(function (widget) {
							return "^" + widget + "$";
						}).join("|"), "m").test(weave.replace(RE_SEPARATOR, "\n"));
			};

	/**
	 * :woven expression
	 * @type {*}
	 */
	$EXPR[":"][WOVEN] = $CREATEPSEUDO
		// If we have jQuery >= 1.8 we want to use .createPseudo
		? $CREATEPSEUDO(function (widgets) {
			// If have widgets to filter by
			if (widgets !== UNDEFINED) {
				// Create regexp from widgets
				widgets = RegExp(getargs.call(widgets).map(function (widget) {
					return "^" + widget + "@\\d+";
				}).join("|"), "m");

				// Return result function
				return function (element) {
					// Get woven attribute
					var woven = $(element).attr(DATA_WOVEN);

					// Check that woven is not UNDEFINED, and that widgets test against a processed woven
					return woven !== UNDEFINED && widgets.test(woven.replace(RE_SEPARATOR, "\n"));
				};
			}
			// Otherwise an optimized version can be used
			else {
				return function (element) {
					return $(element).attr(DATA_WOVEN) !== UNDEFINED;
				};
			}

		})
		// Otherwise fall back to legacy
		: function (element, index, match) {
			var woven = $(element).attr(DATA_WOVEN);

			return woven === UNDEFINED
				? false
				: match === UNDEFINED
					? true
					: RegExp(getargs.call(match[3]).map(function (widget) {
						return "^" + widget + "@\\d+";
					}).join("|"), "m").test(woven.replace(RE_SEPARATOR, "\n"));
		};

	/**
	 * Weaves elements
	 * @returns {Promise} of weaving
	 */
	$FN[WEAVE] = function () {
		var $elements = $(this);
		var weave_args = ARRAY_SLICE.call(arguments);
		var woven = [];
		var wovenLength = 0;

		// Prepare $elements for weaving
		$elements
			// Reduce to only elements that can be woven
			.filter(SELECTOR_WEAVE)
			// Iterate
			.each(function (index, element) {
				var $element = $(element);
				var $data = $element.data();
				// Force $data[WEAVE] to be re-initialized from attr
				var $data_weave = $data[WEAVE] = $element.attr(DATA_WEAVE) || "";

				// Make sure to remove DATA_WEAVE (so we don't try processing this again)
				$element.removeAttr(DATA_WEAVE);

				// When $data[WOVEN] is fulfilled
				when($data[WOVEN]).then(function () {
					var re = /[\s,]*([\w_\-\/\.]+)(?:\(([^\)]+)\))?/g;
					var matches;
					var attr_args;
					var args = [];
					var argsLength = 0;
					var i;
					var iMax;
					var value;

					// Iterate $data_weave (while RE_WEAVE matches)
					while ((matches = re.exec($data_weave)) !== null) {
						// Get attr_args
						attr_args = getargs.call(matches[2]);

						// Iterate end of attr_args
						for (i = 0, iMax = attr_args[LENGTH]; i < iMax; i++) {
							// Get value
							value = attr_args[i];

							// Override if value is in $data
							attr_args[i] = value in $data
								? $data[value]
								: value;
						}

						// Construct and store arguments
						args[argsLength++] = ARRAY_PROTO.concat($element, matches[1], attr_args);
					}

					// Add promise to woven and $data[WOVEN]
					woven[wovenLength++] = $data[WOVEN] = when.map(args, function (widget_args) {
						// Create deferred and resolver
						var deferred = when.defer();
						var resolver = deferred.resolver;

						// Require module, add error handler
						parentRequire([ widget_args[1] ], function (Widget) {
							var widget;

							try {
								// Create widget instance
								widget = Widget.apply(Widget, widget_args);

								// Chain widget.start, resolve deferred with widget instance
								when.chain(widget.start.apply(widget, weave_args), resolver, widget);
							}
							catch (e) {
								// Reject resolver
								resolver.reject(e);
							}
						}, resolver.reject);

						// Return promise
						return deferred.promise;
					}).then(function (_widgets) {
							// Prepare $element for finalizing weave
							$element
								// Set DATA_WOVEN with full names
								.attr(DATA_WOVEN, _widgets.join(" "))
								// Bind destroy event
								.on(DESTROY, onDestroy);

							return _widgets;
						});
				});
			});

		// Return promise of all woven
		return when.all(woven);
	};

	/**
	 * Unweaves elements
	 * @returns {Promise} of unweaving
	 */
	$FN[UNWEAVE] = function () {
		var $elements = $(this);
		var unweave_args = ARRAY_SLICE.call(arguments);
		var unwoven = [];
		var unwovenLength = 0;

		// Prepare $elements for unweaving
		$elements
			// Reduce to only elements that can be unwoven
			.filter(SELECTOR_UNWEAVE)
			// Iterate
			.each(function (index, element) {
				var $element = $(element);
				var $data = $element.data();

				// Remove DATA_WOVEN attribute
				$element.removeAttr(DATA_WOVEN);

				// Add promise to unwoven and $data[WOVEN]
				unwoven[unwovenLength++] = $data[WOVEN] = when.map($data[WOVEN], function (widget) {
					// Create deferred
					var deferred = when.defer();

					// Chain deferred to stop, resolve with widget
					when.chain(widget.stop.apply(widget, unweave_args), deferred.resolver, widget);

					// Return promise
					return deferred.promise;
				}).then(function (_widgets) {
						// Prepare element for unwoven finalization
						$element
							// Copy $data[WEAVE] to data-weave attribute
							.attr(DATA_WEAVE, $data[WEAVE])
							// Make sure to off the destroy event
							.off(DESTROY, onDestroy);

						// Return _widgets (that were unwoven)
						return _widgets;
					});
			});

		// Return promise of all unwoven
		return when.all(unwoven);
	};

	/**
	 * Gets woven widgets
	 * @returns {Promise} of woven widgets
	 */
	$FN[WOVEN] = function () {
		var woven = [];
		var wovenLength = 0;
		var wovenRe = arguments[LENGTH] > 0
			? RegExp(ARRAY_MAP.call(arguments, function (widget) {
				return "^" + widget + "$";
			}).join("|"), "m")
			: UNDEFINED;

		// Iterate
		$(this).each(function (index, element) {
			// Add to woven
			woven[wovenLength++] = wovenRe === UNDEFINED
				// If no wovenRe, just the WOVEN promise
				? $.data(element, WOVEN)
				// Othewise wait for WOVEN to fulfill
				: when($.data(element, WOVEN), function (widgets) {
					// Filter widgets using wovenRe
					return widgets.filter(function (widget) {
						return wovenRe.test(widget.displayName);
					});
				});
		});

		// Return promise of woven
		return when.all(woven);
	};
});
