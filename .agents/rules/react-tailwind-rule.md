---
trigger: always_on
---

React Tailwind Rule

Inspect the actual component, props, state, event flow, and browser console before changing code.
Check whether the issue is caused by rendering logic, state updates, async behavior, CSS utility classes, or layout structure first.
Do not assume a UI bug is a styling issue until the component logic and DOM output are inspected.
For React bugs, inspect props, local state, derived state, effects, memoization, conditional rendering, and component hierarchy.
For event handling bugs, verify input bindings, form state, click handlers, async actions, and error handling.
For Tailwind issues, inspect the actual class names, responsive variants, conditional class logic, parent layout, flex or grid settings, width and height constraints, and overflow behavior.
Do not guess why styling fails without checking the rendered DOM and computed layout in browser dev tools.
Check whether the problem comes from missing classes, conflicting utilities, class merge logic, or component structure.
Prefer the smallest possible code change that can be verified quickly.
After each fix, verify visible UI behavior, browser console output, layout behavior, and responsive behavior.
Summarize root cause, code change, and proof of verification.