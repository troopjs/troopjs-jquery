/*!
 * TroopJS jQuery respond plug-in
 * @license TroopJS Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
define([ "jquery" ], function RespondModule($) {
	var RESPOND = "respond";
	var DIMENSIONS = "dimensions";

	/**
	 * Internal handler for dimensions
	 * @param $event
	 * @param w
	 * @param h
	 */
	function onDimensions($event, w, h) {
		$($event.data).trigger($.Event($event, { type : RESPOND }), [ w, h ]);
	}

	$.event.special[RESPOND] = {
		/**
		 * Do something each time an event handler is bound to a particular element
		 * @param handleObj (Object)
		 */
		add : function onRespondAdd(handleObj) {
			var self = this;
			var doc = self.ownerDocument;

			$(doc.defaultView || doc.parentWindow).bind(DIMENSIONS + "." + handleObj.namespace, self, onDimensions);
		},

		/**
		 * Do something each time an event handler is unbound from a particular element
		 * @param handleObj (Object)
		 */
		remove : function onRespondRemove(handleObj) {
			var doc = this.ownerDocument;

			$(doc.defaultView || doc.parentWindow).unbind(DIMENSIONS + "." + handleObj.namespace, onDimensions);
		}
	};
});