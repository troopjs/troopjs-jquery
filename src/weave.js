/**
 * TroopJS jquery/weave
 * @license MIT http://troopjs.mit-license.org/ © Mikael Karon mailto:mikael@karon.se
 */
/*global define:false */
define([ "require", "jquery", "when", "troopjs-utils/getargs", "./destroy", "poly/array" ], function WeaveModule(parentRequire, $, when, getargs) {
	/*jshint strict:false, laxbreak:true, newcap:false */

	var UNDEFINED;
	var NULL = null;
	var ARRAY_PROTO = Array.prototype;
	var ARRAY_SLICE = ARRAY_PROTO.slice;
	var ARRAY_MAP = ARRAY_PROTO.map;
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
	var $FN = $.fn;
	var $EXPR = $.expr;
	var $CREATEPSEUDO = $EXPR.createPSeudo;

	/**
	 * Generic destroy handler.
	 * Simply makes sure that unweave has been called
	 */
	function onDestroy() {
		$(this).unweave();
	}

	$EXPR[":"][WEAVE] = $CREATEPSEUDO
		? $CREATEPSEUDO(function (widgets) {
			if (widgets !== UNDEFINED) {
				widgets = RegExp(getargs.call(widgets).map(function (widget) {
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
					: RegExp(getargs.call(match[3]).map(function (widget) {
							return "^" + widget + "$";
						}).join("|"), "m").test(weave.split(/[\s,]+/).join("\n"));
			};

	$EXPR[":"][WOVEN] = $CREATEPSEUDO
		? $CREATEPSEUDO(function (widgets) {
			if (widgets !== UNDEFINED) {
				widgets = RegExp(getargs.call(widgets).map(function (widget) {
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
					: RegExp(getargs.call(match[3]).map(function (widget) {
						return "^" + widget + "@\\d+";
					}).join("|"), "m").test(woven.split(/[\s,]+/).join("\n"));
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
					while ((matches = re.exec($data_weave)) !== NULL) {
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
					return $.grep(widgets, function (widget) {
						return wovenRe.test(widget.displayName);
					});
				});
		});

		// Return promise of woven
		return when.all(woven);
	};
});
