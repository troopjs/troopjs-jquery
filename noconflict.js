/**
 * @license MIT http://troopjs.mit-license.org/
 */
define([ "jquery" ], function ($) {
	"use strict";

	/**
	 * Module that simply return a `noConflict` version of jQuery
	 * @class jquery.noconflict
	 * @extends jquery.plugin
	 * @singleton
	 */
	return $.noConflict(true);
});
