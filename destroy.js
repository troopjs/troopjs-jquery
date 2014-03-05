/*
 * @license MIT http://troopjs.mit-license.org/
 */
define([ "jquery" ], function DestroyModule($) {
	"use strict";

	var DESTROY = "destroy";

	/**
	 * @class jquery.destroy
	 * @singleton
	 * Module that adds a {@link $.event#destroy destroy event}
	 */

	/**
	 * A special jQuery event whose handler will be called, only when this handler it's removed from the element.
	 * @member $.event
	 * @event destroy
	 */
	$.event.special[DESTROY] = {
		"noBubble" : true,

		"trigger" : function () {
			return false;
		},

		"remove" : function onDestroyRemove(handleObj) {
			var me = this;

			if (handleObj) {
				handleObj.handler.call(me, $.Event(handleObj.type, {
					"data" : handleObj.data,
					"namespace" : handleObj.namespace,
					"target" : me
				}));
			}
		}
	};
});
