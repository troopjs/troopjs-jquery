/**
 * TroopJS jquery/weave
 * @license MIT http://troopjs.mit-license.org/ © Mikael Karon mailto:mikael@karon.se
 */
/*global define:false */
define([ "require", "jquery", "when", "troopjs-utils/getargs", "troopjs-utils/filter", "./destroy", "poly/array", "poly/string" ], function WeaveModule(parentRequire, $, when, getargs, filter) {
	/*jshint strict:false, laxbreak:true, newcap:false */

	var UNDEFINED;
	var ARRAY_PROTO = Array.prototype;
	var ARRAY_SLICE = ARRAY_PROTO.slice;
	var ARRAY_MAP = ARRAY_PROTO.map;
	var ARRAY_PUSH = ARRAY_PROTO.push;
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
	 * Tests if element has a data-weave attribute
	 * @param element to test
	 * @returns {boolean}
	 * @private
	 */
	function hasDataWeaveAttr(element) {
		return $(element).attr(DATA_WEAVE) !== UNDEFINED;
	}

	/**
	 * Tests if element has a data-woven attribute
	 * @param element to test
	 * @returns {boolean}
	 * @private
	 */
	function hasDataWovenAttr(element) {
		return $(element).attr(DATA_WOVEN) !== UNDEFINED;
	}

	/**
	 * :weave expression
	 * @type {*}
	 */
	$EXPR[":"][WEAVE] = $CREATEPSEUDO
		// If we have jQuery >= 1.8 we want to use .createPseudo
		? $CREATEPSEUDO(function (widgets) {
			// If we don't have widgets to test, quick return optimized expression
			if (widgets === UNDEFINED) {
				return hasDataWeaveAttr;
			}

			// Convert widgets to RegExp
			widgets = RegExp(getargs.call(widgets).map(function (widget) {
				return "^" + widget + "$";
			}).join("|"), "m");

			// Return expression
			return function (element) {
				// Get weave attribute
				var weave = $(element).attr(DATA_WEAVE);

				// Check that weave is not UNDEFINED, and that widgets test against a processed weave
				return weave !== UNDEFINED && widgets.test(weave.replace(RE_SEPARATOR, "\n"));
			};
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
			// If we don't have widgets to test, quick return optimized expression
			if (widgets === UNDEFINED) {
				return hasDataWovenAttr;
			}

			// Convert widgets to RegExp
			widgets = RegExp(getargs.call(widgets).map(function (widget) {
				return "^" + widget + "@\\d+";
			}).join("|"), "m");

			// Return expression
			return function (element) {
				// Get woven attribute
				var woven = $(element).attr(DATA_WOVEN);

				// Check that woven is not UNDEFINED, and that widgets test against a processed woven
				return woven !== UNDEFINED && widgets.test(woven.replace(RE_SEPARATOR, "\n"));
			};
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
			// Bind destroy event
			.on(DESTROY, onDestroy)
			// Iterate
			.each(function (index, element) {
				var $element = $(element);
				var $data = $element.data();
				var $weave = $element.attr(DATA_WEAVE);
				var $widgets = $data[WIDGETS] || ($data[WIDGETS] = []);
				var $widgetsLength = $widgets[LENGTH];
				var $woven = [];
				var $wovenLength = 0;
				var matches;
				var attr_args;
				var i;
				var iMax;
				var value;
				var re = /[\s,]*([\w_\-\/\.]+)(?:\(([^\)]+)\))?/g;

				// Make sure to remove DATA_WEAVE (so we don't try processing this again)
				$element.removeAttr(DATA_WEAVE);

				// Iterate $weave (while re matches)
				// matches[0] : original matching string - " widget/name(1, 'string', false)"
				// matches[2] : widget name - "widget/name"
				// matches[3] : widget $woven - "1, 'string', false"
				while ((matches = re.exec($weave)) !== null) {
					// Create attr_args
					attr_args = [ $element, matches[1] ];

					// Store trimmed matches[0] as WEAVE on attr_args
					attr_args[WEAVE] = matches[0].trim();

					// Transfer arguments from getargs
					ARRAY_PUSH.apply(attr_args, getargs.call(matches[2]));

					// Iterate end of attr_args to copy from $data
					for (i = 2, iMax = attr_args[LENGTH]; i < iMax; i++) {
						// Get value
						value = attr_args[i];

						// Override if value is in $data
						attr_args[i] = value in $data
							? $data[value]
							: value;
					}

					// Store $woven arguments
					$woven[$wovenLength++] = attr_args;
				}

				// Add promise to woven and $data[WOVEN]
				$data[WOVEN] = woven[wovenLength++] = when
					.map($woven, function (widget_args) {
						// Create deferred and resolver
						var deferred = when.defer();
						var resolver = deferred.resolver;
						var promise = deferred.promise;

						// Copy WEAVE
						promise[WEAVE] = widget_args[WEAVE];

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

						// Store and return promise
						return $widgets[$widgetsLength] = $woven[$wovenLength++] = promise;
					})
					.then(function (widgets) {
						// Set DATA_WOVEN with full names
						$element.attr(DATA_WOVEN, widgets.join(" "));

						// Return widgets
						return widgets;
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
