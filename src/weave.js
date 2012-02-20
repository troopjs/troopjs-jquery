/*!
 * TroopJS jQuery weave plug-in
 * @license TroopJS 0.0.1 Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
define([ "jquery" ], function WeaveModule($) {
	var UNDEFINED = undefined;
	var NULL = null;
	var FUNCTION = Function;
	var ARRAY = Array;
	var JOIN = ARRAY.prototype.join;
	var WHEN = $.when;
	var WEAVE = "weave";
	var UNWEAVE = "unweave";
	var WOVEN = "woven";
	var WIDGET_WEAVE = "widget/" + WEAVE;
	var WIDGET_UNWEAVE = "widget/" + UNWEAVE;
	var DATA_WEAVE = "data-" + WEAVE;
	var DATA_WOVEN = "data-" + WOVEN;
	var RE_SEPARATOR = /[\s,]+/;
	var RE_CLEAN = /@\d+/g;

	$.fn[WEAVE] = function weave(deferred) {
		var required = [];
		var i = 0;
		var $elements = $(this);

		$elements.each(function elementIterator(index, element) {
			var $element = $(element);
			var weave = $element.attr(DATA_WEAVE) || "";
			var widgets = weave.split(RE_SEPARATOR);
			var mark = i;
			var j;
			var jMax;

			$element
				// Store widgets array on element
				.data(WOVEN, widgets)
				// Make sure to remove data-weave (so we don't try processing this again)
				.removeAttr(DATA_WEAVE);

			// Iterate widgets
			for (j = 0, jMax = widgets.length; j < jMax; j++) {
				// Add deferred to required array
				required[i++] = $.Deferred(function deferedRequire(dfd) {
					// Store position as 'j' will not be available during require
					var position = j;
					var name = widgets[position];

					try {
						// Require widget
						require([ name ], function required(widget) {
							// If we don'e exist, we can't wire, fail fast
							if (widget === NULL || widget === UNDEFINED) {
								throw new Error("no widget");
							}

							// Instantiate widgets that support it
							if (widget instanceof FUNCTION) {
								widget = new widget(element, name);
							}
							// Otherwise, look for an init method
							else if (widget.init instanceof FUNCTION) {
								widget.init(element, name);
							}

/*							// Set the displayName of the widget
							widget.displayName = name;
*/
							$element
								// Wire widget (widget)
								.wire(widget)
								// Trigger weave
								.triggerHandler(WIDGET_WEAVE, [ widget ]);

							// Replace position with instantiated widget
							widgets[position] = widget;

							// Resolve with widget
							dfd.resolve(widget);
						});
					}
					catch (e) {
						// Replace position with UNDEFINED
						widgets[position] = UNDEFINED;

						// Resolve with original name
						dfd.resolve(name);
					}
				});
			}

			// Slice out widgets woven for this element
			WHEN.apply($, required.slice(mark, i)).done(function doneRequired() {
				// Set 'data-woven' attribute
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
			.each(function elementIterator(index, element) {
				var $element = $(element);
				var widgets = $elemen.data(WOVEN);
				var widget;

				// Quick return if there are no widgets
				if (!widgets instanceof ARRAY) {
					return;
				}

				// Make sure to remove weave data
				$element.removeData(WOVEN);

				// Somewhat safe(r) iterator over widgets
				while (widget = widgets.shift()) {
					// If we don't exist, we can't unwire
					if (widget === NULL || widget === UNDEFINED) {
						continue;
					}

					// Trigger unweave
					$element.triggerHandler(WIDGET_UNWEAVE, [ widget ]);

					// Unwire
					$element.unwire(widget);
				}
			})
			// Copy data-woven attribute to data-weave
			.attr(DATA_WEAVE, function attrIterator(index, attr) {
				return $(this).attr(DATA_WOVEN).replace(RE_CLEAN, "");
			})
			// Remove data-woven attribute
			.removeAttr(DATA_WOVEN);
	};
});