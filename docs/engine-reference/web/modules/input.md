# Web Input — Quick Reference

Last verified: 2026-10-20 | Stack: Web `2026.10` (see `../VERSION.md`) | Sources: MDN, the W3C Gamepad spec and
capacitorjs.com, read on 2026-10-20 (URL on each line)

Browser input is platform API, not a three.js feature: none of this changes with the three.js pin. Input is read in
`packages/client` and turned into commands for `packages/sim`, which never sees a DOM event. Thresholds (dead zones,
repeat delays, sensitivity) are gameplay values: they live in data, as tuning knobs the human sets, never as
constants in code (`.claude/docs/coding-standards.md`).

## Gamepad API

- `gamepadconnected` and `gamepaddisconnected` fire on `window`. A pad already plugged in when the page loads is
  announced only when the user presses a button or moves an axis; `gamepaddisconnected` fires only for a pad the page
  had received data from. — https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
- `getGamepads()` "returns an empty list until a gamepad user gesture has been observed": a "press start" screen is
  the reliable place to detect pads. — https://w3c.github.io/gamepad/
- **Poll every frame.** Call `navigator.getGamepads()` in the frame loop and read the object for a known `index`;
  do not keep a long-lived reference from the `gamepadconnected` event.
  — https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
- The array can hold `null` entries (a pad disconnected and the others keep their index); check before use. A new
  pad can reuse the `index` of one that left. — https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads ,
  https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
- `getGamepads()` throws `SecurityError` when a Permissions Policy blocks it; the policy-controlled feature is
  `"gamepad"` (relevant inside an iframe, as on a web portal). — https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads ,
  https://w3c.github.io/gamepad/
- Each button has `pressed` (boolean) and `value` (0.0–1.0, analog for triggers). Each axis is a float from -1.0 to
  1.0. — https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
- **`mapping === "standard"`** means the browser remapped the pad to the spec's standard layout; otherwise indices
  are device-specific and the game needs a remapping screen (`id` is "not strictly specified").
  — https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping
- Standard layout — https://w3c.github.io/gamepad/ (Remapping):

  | Index | Button | | Index | Button |
  |---|---|---|---|---|
  | 0–3 | right cluster: bottom, right, left, top | | 10, 11 | left / right stick press |
  | 4, 5 | top left / top right front (shoulders) | | 12–15 | left cluster: up, down, left, right (D-pad) |
  | 6, 7 | bottom left / bottom right front (triggers) | | 16 | centre button, centre cluster |
  | 8, 9 | centre cluster: left / right | | | |

  Axes: 0 left stick X, 1 left stick Y, 2 right stick X, 3 right stick Y; **negative is left and up**.
- **No dead zone is applied for you**: the spec defines none. Raw stick values drift near zero, so the game applies
  its own dead zone; its size and shape (radial or per axis) is a tuning knob the human decides.
  — https://w3c.github.io/gamepad/
- `GamepadHapticActuator` (rumble) is listed as an experimental extension.
  — https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API

## Keyboard

- **`code` for game controls, `key` for text.** `KeyboardEvent.code` is the physical key, "not altered by keyboard
  layout or the state of the modifier keys": `"KeyW"` is the same key on QWERTY and AZERTY (where it prints `z`). It
  cannot tell you the character produced or the key's label; `key` gives the character.
  — https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
- On virtual keyboards and assistive devices, `code` is a best-effort match to a physical keyboard.
  — https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
- **Key labels in prompts and rebinding UI**: `navigator.keyboard.getLayoutMap()` maps a `code` to the label of the
  current layout, but it is experimental, not Baseline, secure-context only, and throws `SecurityError` when a
  Permissions Policy blocks it. Feature-detect it and fall back to the `key` of the last press.
  — https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/getLayoutMap
- `KeyboardEvent.repeat` is `true` for the automatic repeats of a held key: ignore them for "just pressed" actions.
  — https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat
- Ignore keys during IME composition: `event.isComposing || event.keyCode === 229` (both checks are needed).
  — https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
- Track held keys in `keydown`/`keyup` and read that state in the frame loop, rather than moving inside the handler.
  — https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Desktop_with_mouse_and_keyboard
- `preventDefault()` stops a default action "such as page scrolling"; call it only for the keys the game consumes,
  and only while the game, not a text field, has focus. A passive listener's `preventDefault()` does nothing.
  — https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault
  NOT SOURCEABLE — which keys scroll the page by default (arrows, Space, Page keys) is not stated on the MDN pages read.

## Focus: the HTML interface over the canvas

- A `keydown` targets the focused element; with nothing focused it goes to `<body>` or the root, and it bubbles to
  `document` and `window`. The target can change between `keydown` and `keyup` (Tab moves focus).
  — https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
  So listen on `window` for game keys and check `document.activeElement`: when an `<input>`, `<textarea>` or a
  menu button has focus, the key belongs to the interface, not the game.
- `tabindex="-1"` makes an element focusable from script (`focus()`) and by click but not by Tab; `tabindex="0"`
  puts it in the Tab order. Use only `0` and `-1`. Prefer real `<button>` elements for menus over a canvas or
  `<div>` with `tabindex`: those do not reach the accessibility tree.
  — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex
- **Release held input when focus leaves.** `window` `blur` fires when the page loses focus (for example to the
  address bar); `visibilitychange` fires on `document` on tab switch, minimise or, on mobile, app switch, and
  `hidden` is "the last event that's reliably observable". Clear the held-key set and pause on both.
  — https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event ,
  https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
  NOT SOURCEABLE — whether `keyup` is delivered for a key released after focus left is not stated on MDN; clearing on
  `blur` is the defensive choice.

## Pointer and touch

- Pointer events unify mouse, pen and touch; `pointerType` tells them apart and `pointerId` follows each finger.
  `setPointerCapture()` keeps a drag on its element; capture ends on `pointerup` or `pointercancel`.
  — https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- The browser fires `pointercancel` when it takes the gesture for a pan or zoom. On the game surface set
  `touch-action: none` (the browser intersects the value with the element's ancestors, and changing it mid-gesture
  has no effect). It also blocks pinch-zoom there: keep it on the play area, not the whole page.
  — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action
- **Pointer Lock** (mouse-look): `requestPointerLock()` needs an engagement gesture (call it from a `click`),
  returns a promise in supporting browsers, and Esc exits it (`pointerlockchange` on `document`). Read `movementX`/
  `movementY`; `{ unadjustedMovement: true }` disables OS acceleration where supported (`NotSupportedError`
  otherwise). A sandboxed iframe needs `allow-pointer-lock`. The API is not Baseline.
  — https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API

## Safe-area insets (Capacitor 8)

- `env(safe-area-inset-top|right|bottom|left)` is the inset where content is not cut off; `0` on a rectangular
  viewport. Its second argument is a fallback. — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env
- `<meta name="viewport" content="width=device-width, viewport-fit=cover">` fills the display; MDN recommends the
  inset variables with it. — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport
- **Capacitor 8 SystemBars** (core plugin) owns edge-to-edge; `insetsHandling` is Android-only, with values `css`
  (default), `native` (recommended) and `disable` (not recommended). Capacitor 9 will default to `native`.
  — https://capacitorjs.com/docs/apis/system-bars
  - Android WebView below Chromium 140 does not report correct `env(safe-area-inset-*)` values. `native` pads the
    WebView there and sets `env()` to `0px`; from 140 it follows `viewport-fit`, and with `cover` the `env()` values
    are correct. `css` does the same and also injects `--safe-area-inset-*` variables with the right values.
  - With `insetsHandling` not `disable`, the page suggests `EdgeToEdge.enable(this);` in `BridgeActivity.onCreate`.
  - iOS needs `UIViewControllerBasedStatusBarAppearance` = YES in `Info.plist`.
  - `android.adjustMarginsForEdgeToEdge` is gone in 8 (`../breaking-changes.md`).
- Place HUD and touch controls inside the insets; the canvas may run edge to edge behind them.
  NOT SOURCEABLE — a combined fallback such as `var(--safe-area-inset-top, env(safe-area-inset-top))` is not shown on
  the Capacitor page; check it on the oldest target device (`.claude/docs/run-and-observe.md`).

## Common Mistakes

- Storing the `Gamepad` from `gamepadconnected` and reading it later, instead of `getGamepads()` each frame.
- Expecting a pad to appear before the player presses anything on it.
- Assuming `buttons[0]` is "A" when `mapping` is not `"standard"`.
- Using raw axes without a dead zone, or hard-coding the dead zone instead of reading it from data.
- Binding movement to `key` (`"w"`): AZERTY players lose WASD. Showing `code` (`"KeyW"`) to players as a label.
- Acting on `keydown` repeats for one-shot actions (jump, menu confirm).
- `preventDefault()` on every key, which breaks typing in name fields and Tab navigation.
- Leaving keys "stuck" down after alt-tab or a tab switch because the held set is not cleared on `blur`/`hidden`.
- `touch-action: none` on `<body>`, which removes pinch-zoom from the whole page.
- HUD under the notch or the gesture bar on Android because `env()` reads `0px` on an old WebView.

## Not sourced

- Gamepad API support in Capacitor's WebViews (Android WebView, iOS WKWebView) and on Safari.
- `getGamepads()` behaviour in a background tab.
- A full browser-compatibility table for `getLayoutMap()` and Pointer Lock (MDN marks both limited; the table was not
  read).

## Sources

Each line above names its source. Pages read: MDN (Gamepad API, KeyboardEvent, Keyboard, focus, Pointer events,
Pointer Lock, CSS `env()`, meta viewport), https://w3c.github.io/gamepad/ and https://capacitorjs.com/docs/apis/system-bars.
