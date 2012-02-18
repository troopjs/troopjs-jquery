/*!
 * TroopJS jQuery action plug-in
 * @license TroopJS 0.0.1 Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
define([ "jquery" ], function ActionModule($) {
	var UNDEFINED = undefined;
	var FALSE = false;
	var NULL = null;
	var SLICE = Array.prototype.slice;
	var ACTION = "action";
	var TRUE = "true";
	var CLICK = "click." + ACTION;
	var RE_ACTION = /^([\w\d\s_\-\/]+)(?:\((.*)\))?$/;
	var RE_SEPARATOR = /[\s,]+/;
	var RE_STRING = /^(["'])(.*)\1$/;
	var RE_DIGIT = /^(\d+)$/;
	var RE_BOOLEAN = /^(false|true)$/;

	/**
	 * Internal click handler
	 * 
	 * @param $event jQuery event
	 */
	function clickHandler($event) {
		// Get closest element that has an action defined
		var $target = $($event.target).closest("[data-action]");

		// Fail fast if there is no action available
		if ($target.length === 0) {
			return;
		}

		// Extract all data in one go
		var $data = $target.data();
		// Extract matches from 'data-action'
		var matches = RE_ACTION.exec($data[ACTION]);

		// Return fast if action parameter was f*cked (no matches)
		if (matches === NULL) {
			return;
		}

		// At this point we know we want to handle this event, so don't bubble
		$event.stopPropagation();
		// or execute default
		$event.preventDefault();

		// Extract action name
		var name = matches[1];
		// Extract action args
		var args = matches[2];
		// Split args by separator (if there were args)
		var argv = args !== UNDEFINED ? args.split(RE_SEPARATOR) : [];

		// Iterate argv to determine arg type
		$.each(argv, function argsIterator(i, key) {
			if (key in $data) {
				argv[i] = $data[key];
			} else if (RE_STRING.test(key)) {
				argv[i] = RE_STRING.exec(key)[2];
			} else if (RE_DIGIT.test(key)) {
				argv[i] = RE_DIGIT.exec(key)[1];
			} else if (RE_BOOLEAN.test(key)) {
				argv[i] = RE_BOOLEAN.exec(key)[1] === TRUE;
			}
		});

		// Construct $Event
		var $Event = $.Event($event, {
			type : ACTION + "/" + name,
			action : name
		});

		// Trigger 'ACTION/{name}'
		$target.trigger($Event, argv);

		// No handler, try generic action even
		if ($Event.result !== FALSE) {
			// Reset $Event.type
			$Event.type = ACTION;

			// Trigger 'ACTION'
			$target.trigger($Event, argv);
		}
	}

	$.event.special[ACTION] = {
		/**
		 * @param data (Anything) Whatever eventData (optional) was passed in
		 *        when binding the event.
		 * @param namespaces (Array) An array of namespaces specified when
		 *        binding the event.
		 * @param eventHandle (Function) The actual function that will be bound
		 *        to the browser’s native event (this is used internally for the
		 *        beforeunload event, you’ll never use it).
		 */
		setup : function onActionSetup(data, namespaces, eventHandle) {
			$(this).bind(CLICK, data, clickHandler);
		},

		/**
		 * @param namespaces (Array) An array of namespaces specified when
		 *        binding the event.
		 */
		teardown : function onActionTeardown(namespaces) {
			$(this).unbind(CLICK, clickHandler);
		}
	};

	/**
	 * Action shorthand
	 * 
	 * @parm name Action name to trigger
	 */
	$.fn[ACTION] = function Action(name) {
		// Set target to ourselves
		var $target = $(this);
		// Get argv
		var argv = SLICE.call(arguments, 1);

		// Construct $Event
		var $Event = $.Event({
			type : ACTION + "/" + name,
			action : name
		});

		// Trigger 'ACTION/{name}'
		$target.trigger($Event, argv);

		// No handler, try generic action even
		if ($Event.result !== FALSE) {
			// Reset $Event.type
			$Event.type = ACTION;

			// Trigger 'ACTION'
			$target.trigger($Event, argv);
		}

		return $target;
	};
});
