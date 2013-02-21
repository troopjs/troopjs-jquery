/**
 * TroopJS jquery/destroy
 * @license MIT http://troopjs.mit-license.org/ © Mikael Karon mailto:mikael@karon.se
 */
/*global define:false */
define([ "jquery" ], function DestroyModule($) {
	/*jshint strict:false, smarttabs:true */

	var DESTROY = "destroy";

	$.event.special.destroy = {
		"add" : function onDestroyAdd(handleObj) {
			var $events;

			// Prevent adding more than one destroy event handler if the namespace is "singleton"
			return !(handleObj.namespace === "singleton"
				&& ($events = $._data(this, "events"))
				&& DESTROY in $events
				&& $events[DESTROY].length > 0);
		},

		"remove" : function onDestroyRemove(handleObj) {
			var self = this;

			handleObj.handler.call(self, $.Event({
				"type" : handleObj.type,
				"data" : handleObj.data,
				"namespace" : handleObj.namespace,
				"target" : self
			}));
		}
	};
});
