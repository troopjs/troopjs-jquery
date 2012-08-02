/*!
 * TroopJS jQuery destroy plug-in
 * @license TroopJS Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
/*jshint strict:false, smarttabs:true */
/*global define:true */
define([ "jquery" ], function DestroyModule($) {
	$.event.special.destroy = {
		remove : function onDestroyRemove(handleObj) {
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
