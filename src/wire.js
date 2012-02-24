/*!
 * TroopJS jQuery wire plug-in
 * @license TroopJS 0.0.1 Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
define([ "jquery", "troopjs/pubsub/hub" ], function WireModule($, hub) {
	var UNSHIFT = Array.prototype.unshift;
	var FUNCTION = Function;
	var UNDEFINED = undefined;
	var NULL = null;
	var FALSE = false;

	var RE_WIRE = /^(app|dom)(?::(one))?\/(.+)/;
	var HUB = "hub";
	var DOM = "dom";
	var ONE = "one";
	var BIND = "bind";
	var WIRE = "wire";
	var UNWIRE = "unwire";
	var BEFORE_WIRE = "beforeWire";
	var BEFORE_UNWIRE = "beforeUnwire";
	var PROXIES = "proxies";

	function $EventProxy(topic, widget, handler) {
		return function $eventProxy() {
			// Add topic to front of arguments
			UNSHIFT.call(arguments, topic);

			// Apply with shifted arguments to handler
			return handler.apply(widget, arguments);
		};
	}

	$.fn[WIRE] = function wire(widget) {
		return $(this)
			.each(function elementIterator(index, element) {
				var key = UNDEFINED;
				var value;
				var matches;
				var topic;
				var proxies;
				var beforeWire;

				// Is there a before wire
				if (BEFORE_WIRE in widget) {
					// Get handle to beforeWire
					beforeWire = widget[BEFORE_WIRE];

					// Is beforeWire a function
					if (beforeWire instanceof FUNCTION) {
						// If beforeWire returns FALSE we should break
						if (beforeWire.call(widget, element) === FALSE) {
							return FALSE;
						}
					}
				}

				// Make sure we have proxies
				proxies = widget[PROXIES] = PROXIES in widget
					? widget[PROXIES]
					: {};

				// Loop over each property in widget
				for (key in widget) {
					value = widget[key];

					// Match wire signature in key
					matches = RE_WIRE.exec(key);

					if (matches !== NULL) {
						// get topic
						topic = matches[3];

						switch (matches[1]) {
						case HUB:
							// Subscribe to topic
							hub.subscribe(topic, widget, value);
							break;

						case DOM:
							// Replace value with a scoped proxy and store in proxies
							proxies[topic] = value = $EventProxy(topic, widget, value);

							// Either ONE or BIND element
							$(element)[matches[2] === ONE ? ONE : BIND](topic, widget, value);
							break;
						}
					}
				}
			});
	};

	$.fn[UNWIRE] = function unwire(widget) {
		return $(this).each(function elementIterator(index, element) {
			var key = UNDEFINED;
			var matches;
			var proxies;
			var topic;
			var beforeUnwire;

			// Is there a before wire
			if (BEFORE_UNWIRE in widget) {
				// Get handle to beforeWire
				beforeUnwire = widget[BEFORE_UNWIRE];

				// Is beforeUnwire a function
				if (beforeUnwire instanceof FUNCTION) {
					// If beforeUnwire returns FALSE we should break
					if (beforeUnwire.call(widget, element) === FALSE) {
						return FALSE;
					}
				}
			}

			// Make sure we have proxies
			proxies = widget[PROXIES] = PROXIES in widget
				? widget[PROXIES]
				: {};

			// Loop over each property in widget
			for (key in widget) {
				// Match wire signature in key
				matches = RE_WIRE.exec(key);

				if (matches !== NULL) {
					topic = matches[3];

					switch (matches[1]) {
					case APP:
						// Unsubscribe from topic
						hub.unsubscribe(topic, widget[key]);
						break;

					case DOM:
						// Unbind from element (note we're unbinding the proxy)
						$(element).unbind(topic, proxies[topic]);
						break;
					}
				}
			}
		});
	};
});
