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
	var ORIGINALEVENT = "originalEvent";
	var RE_ACTION = /^([\w\d\s_\-\/]+)(?:\((.*)\))?$/;
	var RE_SEPARATOR = /[\s,]+/;
	var RE_STRING = /^(["']).*\1$/;
	var RE_DIGIT = /^\d+$/;
	var RE_BOOLEAN = /^false|true$/;

	/**
	 * Namespace iterator
	 * @param namespace (string) namespace
	 * @param index (number) index
	 */
	function namespaceIterator(namespace, index) {
		return namespace ? namespace + "." + ACTION : NULL;
	}

	/**
	 * Action handler
	 * @param $event (jQuery.Event) event
	 */
	function onAction($event) {
		// Set $target
		var $target = $(this);
		// Get argv
		var argv = SLICE.call(arguments, 1);
		// Extract type
		var type = ORIGINALEVENT in $event
			? $event[ORIGINALEVENT].type
			: ACTION;
		// Extract name
		var name = $event[ACTION];

		// Reset $event.type
		$event.type = ACTION + "/" + name + "." + type;

		// Trigger 'ACTION/{name}.{type}'
		$target.trigger($event, argv);

		// No handler, try without namespace, but exclusive
		if ($event.result !== FALSE) {
			// Reset $event.type
			$event.type = ACTION + "/" + name + "!";

			// Trigger 'ACTION/{name}'
			$target.trigger($event, argv);

			// Still no handler, try generic action with namespace
			if ($event.result !== FALSE) {
				// Reset $event.type
				$event.type = ACTION + "." + type;

				// Trigger 'ACTION.{type}'
				$target.trigger($event, argv);
			}
		}
	}

	/**
	 * Internal handler
	 * 
	 * @param $event jQuery event
	 */
	function handler($event) {
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
				argv[i] = key.slice(1, -1);
			} else if (RE_DIGIT.test(key)) {
				argv[i] = Number(key);
			} else if (RE_BOOLEAN.test(key)) {
				argv[i] = key === TRUE;
			}
		});

		// Trigger ACTION event
		$target.trigger($.Event($event, {
			type: ACTION + "!",
			action: name
		}), argv);
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
			$(this).bind(ACTION, data, onAction);
		},

		/**
		 * Do something each time an event handler is bound to a particular element
		 * @param handleObj (Object)
		 */
		add : function onActionAdd(handleObj) {
			var events = $.map(handleObj.namespace.split("."), namespaceIterator);

			if (events.length !== 0) {
				$(this).bind(events.join(" "), handler);
			}
		},

		/**
		 * Do something each time an event handler is unbound from a particular element
		 * @param handleObj (Object)
		 */
		remove : function onActionRemove(handleObj) {
			var events = $.map(handleObj.namespace.split("."), namespaceIterator);

			if (events.length !== 0) {
				$(this).unbind(events.join(" "), handler);
			}
		},

		/**
		 * @param namespaces (Array) An array of namespaces specified when
		 *        binding the event.
		 */
		teardown : function onActionTeardown(namespaces) {
			$(this).unbind(ACTION, onAction);
		}
	};
});
