import React from 'dom-chef';
import {css} from 'code-tag';
import onetime from 'onetime';
import {ParseSelector} from 'typed-query-selector/parser';

import getCallerID from './caller-id';
import isDevelopmentVersion from './is-development-version';

const animation = 'rgh-selector-observer';
const getListener = <ExpectedElement extends HTMLElement>(seenMark: string, selector: string, callback: (element: ExpectedElement) => void) => function (event: AnimationEvent) {
	const target = event.target as ExpectedElement;
	// The target can match a selector even if the animation actually happened on a ::before pseudo-element, so it needs an explicit exclusion here
	if (target.classList.contains(seenMark) || !target.matches(selector)) {
		return;
	}

	// Removes this specific selector’s animation once it was seen
	target.classList.add(seenMark);

	callback(target);
};

const registerAnimation = onetime((): void => {
	document.head.append(<style>{`@keyframes ${animation} {}`}</style>);
});

export default function observe<
	Selector extends string,
>(
	selectors: Selector | readonly Selector[],
	listener: (element: ParseSelector<Selector, HTMLElement>) => void,
	{signal}: {signal?: AbortSignal} = {},
): void {
	if (signal?.aborted) {
		return;
	}

	const selector = String(selectors); // Array#toString() creates a comma-separated string
	const seenMark = 'rgh-seen-' + getCallerID();

	registerAnimation();

	const rule = document.createElement('style');
	if (isDevelopmentVersion()) {
		// For debuggability
		rule.setAttribute('s', selector);
	}

	rule.textContent = css`
		:where(${String(selector)}):not(.${seenMark}) {
			animation: 1ms ${animation};
		}
	`;
	document.body.prepend(rule);
	signal?.addEventListener('abort', () => {
		rule.remove();
	});
	window.addEventListener('animationstart', getListener(seenMark, selector, listener), {signal});
}
