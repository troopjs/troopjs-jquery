/*!
 * TroopJS jQuery dimensions plug-in
 * @license TroopJS 0.0.1 Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
define([ "jquery" ], function DimensionsModule($) {
	var RE = /(w|h)(\d*)/g;
	var DIMENSIONS = "dimensions";
	var RESIZE = "resize." + DIMENSIONS;
	var W = "w";
	var H = "h";
	var _W = "_" + W;
	var _H = "_" + H;

	/**
	 * Internal comparator used for reverse sorting arrays
	 */
	function reverse(a, b) {
		return a < b ? 1 : a > b ? -1 : 0;
	}

	function onResize($event) {
		var $self = $(this);
		var w = $self.width();
		var h = $self.height();

		$.each($self.data(DIMENSIONS), function dimensionIterator(namespace, dimension) {
			var dimension_w = dimension[W];
			var dimension_w_max = dimension_w.length - 1;
			var dimension_h = dimension[H];
			var dimension_h_max = dimension_h.length - 1;

			var _w = $.grep(dimension_w, function(_w, i) {
				return _w <= w || i === dimension_w_max;
			})[0];
			var _h = $.grep(dimension_h, function(_h, i) {
				return _h <= h || i === dimension_h_max;
			})[0];

			if (_w !== dimension[_W] || _h !== dimension[_H]) {
				dimension[_W] = _w;
				dimension[_H] = _h;

				$self.trigger(DIMENSIONS + "." + namespace, [ _w, _h ]);
			}
		});
	}

	$.event.special[DIMENSIONS] = {
		/**
		 * @param data (Anything) Whatever eventData (optional) was passed in
		 *        when binding the event.
		 * @param namespaces (Array) An array of namespaces specified when
		 *        binding the event.
		 * @param eventHandle (Function) The actual function that will be bound
		 *        to the browser’s native event (this is used internally for the
		 *        beforeunload event, you’ll never use it).
		 */
		setup : function onDimensionsSetup(data, namespaces, eventHandle) {
			$(this)
				.bind(RESIZE, onResize)
				.data(DIMENSIONS, {});
		},

		add : function onDimensionsAdd(handleObj) {
			var namespace = handleObj.namespace;
			var dimension = {};
			var w = dimension[W] = [];
			var h = dimension[H] = [];
			var matches;

			while (matches = RE.exec(namespace)) {
				dimension[matches[1]].push(parseInt(matches[2]));
			}

			w.sort(reverse);
			h.sort(reverse);

			$.data(this, DIMENSIONS)[namespace] = dimension;
		},

		remove : function onDimensionsRemove(handleObj) {
			delete $.data(this, DIMENSIONS)[handleObj.namespace];
		},

		/**
		 * @param namespaces (Array) An array of namespaces specified when
		 *        binding the event.
		 */
		teardown : function onDimensionsTeardown(namespaces) {
			$(this)
				.removeData(DIMENSIONS)
				.unbind(RESIZE, onResize);
		}
	};
});