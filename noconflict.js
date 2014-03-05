/*
 * @license MIT http://troopjs.mit-license.org/
 */
define([ "jquery" ], function ($) {
	"use strict";

	/**
	 * @class jquery.noconflict
	 * @singleton
	 * Module that simply return a `noConflict` version of jQuery
	 */
	return $.noConflict(true);
});
