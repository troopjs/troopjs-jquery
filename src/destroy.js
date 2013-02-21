/**
 * TroopJS jquery/destroy
 * @license MIT http://troopjs.mit-license.org/ © Mikael Karon mailto:mikael@karon.se
 */
/*global define:false */
define([ "jquery" ], function DestroyModule($) {
	/*jshint strict:false, smarttabs:true */

	var DESTROY = "destroy";

	$.event.special[DESTROY] = {
		"add" : function onDestroyAdd(handleObj) {
			return $.grep($._data(this, "events")[DESTROY], function (_handleObj) {
				return handleObj.guid === _handleObj.guid;
			}).length > 0;
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
