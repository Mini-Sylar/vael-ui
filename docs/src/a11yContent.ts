// Each component's keyboard map, roles and focus behavior, for its page's Accessibility section
// and the site's llms.txt. Written from the component's own code: change it with the component.

export interface A11yKey {
  /** Keys that do the same thing, ' / ' between them; ' + ' joins a combination. */
  keys: string
  action: string
}

export interface A11yInfo {
  /** The WAI-ARIA Authoring Practices pattern it follows. */
  pattern?: { name: string; url: string }
  keyboard: A11yKey[]
  /** Roles, labels to provide, focus and announcements. */
  notes: string[]
}

export const a11yContent: Record<string, A11yInfo> = {
  ConfigProvider: {
    keyboard: [],
    notes: [
      'Renders a `display: contents` wrapper with no role, so it adds nothing to the accessibility tree.',
      '`i18n` and `messages` translate the accessible names vael-ui supplies, such as “Dismiss”, “More actions”, “Notifications” and the hold hint “Press and hold to confirm”.',
      '`motion: false` sets every duration token inside to `0s`, so components change at once.',
      'It doesn’t set `dir`. Components read the computed `direction`, so put `dir="rtl"` on an ancestor and the arrow keys follow it.',
    ],
  },
  Button: {
    pattern: { name: 'Button', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/button/' },
    keyboard: [{ keys: 'Enter / Space', action: 'Runs the action.' }],
    notes: [
      'A native `<button>` by default. With `as` set to a plain tag, such as `div` or an `a` without `href`, it gets `role="button"`, a Tab stop, and Enter and Space. A link with an `href` stays a link.',
      '`loading` sets `aria-busy` and `aria-disabled` but not `disabled`, so the button keeps focus. Clicks are ignored while it loads.',
      'An `icon` button has no visible text: give it an `aria-label`. `v-model:pressed` sets `aria-pressed`, and the loader and the `#leading` and `#trailing` slots are `aria-hidden`.',
      'With `hold`, holding Enter or Space fills the button and runs the action when the fill completes. Letting go early cancels. A hidden “Press and hold to confirm” hint is linked through `aria-describedby`.',
    ],
  },
  ButtonGroup: {
    keyboard: [
      {
        keys: 'Tab / Shift + Tab',
        action: 'Moves between the buttons; each one is its own Tab stop.',
      },
      { keys: 'Enter / Space', action: 'Runs or toggles the focused button.' },
    ],
    notes: [
      'Renders `role="group"`. Pass `aria-label` to name the group.',
      'With `v-model`, every Button inside that has a `value` becomes a toggle and gets `aria-pressed`. Without it, the group only joins the buttons visually.',
    ],
  },
  SplitButton: {
    pattern: { name: 'Menu Button', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/' },
    keyboard: [
      {
        keys: 'Enter / Space',
        action: 'Runs the main action, or opens the menu from the arrow button.',
      },
      {
        keys: 'ArrowDown',
        action: 'Opens the menu from the arrow button and focuses the first item.',
      },
      {
        keys: 'ArrowUp',
        action: 'Opens the menu from the arrow button and focuses the last item.',
      },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves to the next or previous item in the menu, wrapping at the ends.',
      },
      { keys: 'Home / End', action: 'Moves to the first or last item.' },
      {
        keys: 'Enter / Space',
        action: 'Activates the focused item and closes the menu, unless the item has `keepOpen`.',
      },
      { keys: 'ArrowRight', action: 'Opens the focused item’s submenu.' },
      { keys: 'ArrowLeft', action: 'Closes the submenu and focuses its parent item.' },
      {
        keys: 'A letter',
        action: 'Moves to the next item whose label starts with the typed letters.',
      },
      {
        keys: 'Escape',
        action: 'Closes the innermost open menu and returns focus to what opened it.',
      },
      {
        keys: 'Tab / Shift + Tab',
        action: 'Closes the menu and moves focus past or back to the arrow button.',
      },
    ],
    notes: [
      'Two native `<button>` elements. The arrow button is named “More actions” by default (`triggerLabel` changes it), names the menu, and gets `aria-haspopup="menu"`, `aria-expanded` and, while open, `aria-controls`.',
      'The menu is `role="menu"` with `menuitem` rows, `menuitemcheckbox` rows with `aria-checked` for checkable items, and `role="separator"` dividers. A row with a submenu gets `aria-haspopup="menu"` and `aria-expanded`, and names the submenu.',
      'Rows use a roving `tabindex`. Disabled rows are skipped.',
      'Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  Toolbar: {
    pattern: { name: 'Toolbar', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/' },
    keyboard: [
      { keys: 'Tab', action: 'Moves focus to the item focused last, then out of the toolbar.' },
      {
        keys: 'ArrowRight / ArrowLeft',
        action: 'Moves to the next or previous item in a horizontal toolbar, wrapping at the ends.',
      },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves to the next or previous item in a vertical toolbar, wrapping at the ends.',
      },
      { keys: 'Home / End', action: 'Moves to the first or last item.' },
    ],
    notes: [
      'Renders `role="toolbar"`, with `aria-orientation="vertical"` when vertical. Pass `aria-label` to name it.',
      'Items use a roving `tabindex`, so the toolbar is one Tab stop. Disabled items are skipped. Text fields, selects and editable areas inside keep their own arrow keys, Home and End, as does a child that calls `preventDefault`.',
      'Items that overflow are hidden and listed in a Menu behind a button named by `overflowLabel` (a translated “More” by default). Toggles with `aria-pressed` show there as checkbox rows.',
      'Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  SpeedDial: {
    keyboard: [
      {
        keys: 'Enter / Space',
        action: 'Opens or closes the dial from the trigger, or runs the focused action.',
      },
      {
        keys: 'ArrowUp / ArrowDown / ArrowLeft / ArrowRight',
        action:
          'Moves between actions along the `direction` they fan out in, wrapping at the ends.',
      },
      { keys: 'Home / End', action: 'Moves to the first or last action.' },
      {
        keys: 'A letter',
        action: 'Moves to the next action whose label starts with the typed letters.',
      },
      {
        keys: 'Escape',
        action: 'Closes the dial, and focuses the trigger if focus was inside it.',
      },
    ],
    notes: [
      'The trigger is a native `<button>` with `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` while open, and `aria-label` (a translated “Actions” by default). While open, the actions sit in `role="menu"` as `menuitem` buttons named by each item’s `label`.',
      'Opening with a click or a key moves focus to the first action; opening on hover leaves focus where it is. Choosing an action closes the dial and returns focus to the trigger, and focus moving outside the dial closes it.',
      'With `direction` `up`, ArrowUp moves away from the trigger; `left` and `right` use the horizontal arrows. The directions are physical, so the arrow keys don’t swap right to left.',
    ],
  },
  Dial: {
    pattern: { name: 'Slider', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/slider/' },
    keyboard: [
      { keys: 'ArrowRight / ArrowUp', action: 'Increases the value by one `step`.' },
      { keys: 'ArrowLeft / ArrowDown', action: 'Decreases the value by one `step`.' },
      { keys: 'PageUp / PageDown', action: 'Changes the value by ten steps.' },
      { keys: 'Home / End', action: 'Sets the value to `min` or `max`, when they are set.' },
    ],
    notes: [
      'Renders `role="slider"` with `aria-valuenow`, plus `aria-valuemin` and `aria-valuemax` when `min` and `max` are set.',
      'Without `min` and `max`, `aria-valuetext` reads the value, so screen readers don’t assume 0 to 100. `valueText` replaces it.',
      'It needs a name: wrap it in a Field, or pass `aria-label` or `aria-labelledby`. They land on the focusable dial.',
      'Disabled, it sets `aria-disabled` and leaves the Tab order. Invalid, it sets `aria-invalid`.',
    ],
  },
  SelectButton: {
    pattern: { name: 'Radio Group', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/radio/' },
    keyboard: [
      { keys: 'Tab', action: 'Moves focus into the group and out of it.' },
      {
        keys: 'ArrowRight / ArrowDown / ArrowLeft / ArrowUp',
        action: 'Moves to and selects the next or previous option (single choice).',
      },
      { keys: 'Space', action: 'Selects the focused option, or toggles it with `multiple`.' },
    ],
    notes: [
      'Built on native inputs: radios inside `role="radiogroup"`, or checkboxes inside `role="group"` with `multiple`. The browser handles the keys.',
      'Give the group a name: wrap it in a Field, or pass `aria-label`. A Field also sets `aria-invalid` and `aria-required` on it.',
      'Each option’s `label` is its accessible name. The sliding highlight is `aria-hidden`.',
    ],
  },
  Toaster: {
    keyboard: [
      { keys: 'Enter / Space', action: 'Runs the focused toast’s action or dismiss button.' },
    ],
    notes: [
      'Toasts render in a `<section aria-live="polite">` named “Notifications”, so screen readers announce them without moving focus. Error toasts are announced assertively. Pass `aria-label` to rename the section when a page has more than one Toaster.',
      'Hovering or focusing the stack expands it and pauses every timer; timers also pause while the tab is hidden. Toasts close after 4000 ms by default, and loading toasts stay until they settle.',
      'The dismiss button is named “Dismiss” and the status icon is `aria-hidden`. A custom default slot replaces this markup, so label your own buttons.',
      'Dismissing a toast from the keyboard moves focus to a neighboring toast, or back to where focus came from.',
    ],
  },
  Message: {
    keyboard: [
      { keys: 'Enter / Space', action: 'Closes the message from the focused dismiss button.' },
    ],
    notes: [
      'Renders `role="alert"` for `error` and `warning` and `role="status"` otherwise; the `role` prop overrides it.',
      'The `closable` button is named “Dismiss”. The status icon is `aria-hidden`.',
      'Closing it from the keyboard moves focus to the next focusable element, so focus doesn’t drop to the page.',
    ],
  },
  Progress: {
    keyboard: [],
    notes: [
      'Renders `role="progressbar"` with `aria-valuemin="0"`, `aria-valuemax` and `aria-valuenow`. With no `value`, it is indeterminate and leaves out `aria-valuenow`.',
      'Name it with the `label` prop, `aria-label` or `aria-labelledby`. They land on the bar, not the wrapper, and so does `aria-describedby`.',
      'With segments, `aria-valuenow` is their total. `valueText` sets `aria-valuetext`, such as “42 GB of 100 GB”.',
      'Under reduced motion, the fill stops transitioning and the indeterminate state pulses instead of sliding.',
    ],
  },
  Loader: {
    keyboard: [],
    notes: [
      'Without `label`, it is `aria-hidden`, so pair it with visible text or a busy state on what it stands for.',
      'With `label`, it renders `role="status"` named by visually hidden text, so screen readers announce it.',
      'Under reduced motion, the built-in animations pulse instead of spinning.',
    ],
  },
  Skeleton: {
    keyboard: [],
    notes: [
      'Always `aria-hidden`; content in its slot only sizes it and stays hidden.',
      'Screen readers get no loading state from it, so mark the region it stands for with `aria-busy="true"` or add a Loader with a `label`.',
      'Under reduced motion, the pulse runs at half speed.',
    ],
  },
  Input: {
    keyboard: [],
    notes: [
      'Renders a native `<input>` and adds no keys of its own.',
      'Inside a `Field`, the label names the input. `aria-describedby` lists your own ids first, then the Field’s description and error. The error has `role="alert"`, so it is announced when it appears.',
      'Outside a `Field`, give it an `aria-label`, which goes to the input. It sets `aria-invalid` when invalid and `aria-required` when the `Field` is required.',
      'With `clearable`, a clear button named “Clear” shows while there’s text. It is a Tab stop, and clearing puts focus back in the input. The `#display` slot is `aria-hidden`; screen readers read the input underneath.',
    ],
  },
  Textarea: {
    keyboard: [],
    notes: [
      'Renders a native `<textarea>` and adds no keys of its own.',
      'Inside a `Field`, the label names it. `aria-describedby` lists your own ids first, then the Field’s description and error.',
      'Outside a `Field`, give it an `aria-label`, which goes to the textarea. It sets `aria-invalid` when invalid and `aria-required` when the `Field` is required.',
      'The `#display` slot is `aria-hidden`; screen readers read the textarea underneath.',
    ],
  },
  InputNumber: {
    pattern: { name: 'Spinbutton', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/' },
    keyboard: [
      { keys: 'ArrowUp', action: 'Adds one `step`, up to `max`.' },
      { keys: 'ArrowDown', action: 'Subtracts one `step`, down to `min`.' },
      { keys: 'Home', action: 'Sets the value to `min`, when `min` is set.' },
      { keys: 'End', action: 'Sets the value to `max`, when `max` is set.' },
      { keys: 'Enter', action: 'Clamps the typed value to `min` and `max` and formats it.' },
    ],
    notes: [
      'A text input with `role="spinbutton"`, `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.',
      'The stepper buttons are out of the tab order (`tabindex="-1"`) and labeled “Increase” and “Decrease”; the arrow keys do the same job.',
      'Keys do nothing while it is disabled or read-only. Leaving the field clamps and formats the value, like Enter.',
      'It is built on `Input`, so `Field` labels it the same way.',
    ],
  },
  OtpInput: {
    keyboard: [
      { keys: 'A digit', action: 'Fills the current cell and moves to the next one.' },
      { keys: 'Backspace', action: 'Deletes the character before the caret.' },
      {
        keys: 'ArrowLeft / ArrowRight',
        action: 'Moves the caret, and the highlighted cell, between cells.',
      },
    ],
    notes: [
      'One native text input sits over the cells and takes all typing and paste; the cells are `aria-hidden`.',
      'Inside a `Field`, the label names the input. Outside one, give it an `aria-label` or `aria-labelledby`; both go to the input, not the wrapper.',
      'It sets `autocomplete="one-time-code"`, so browsers can fill a code from a text message. With `type="alphanumeric"` letters work too, and other characters are dropped.',
      'With `mask`, the cells show bullets and the input becomes a password field, so screen readers don’t read the code aloud.',
    ],
  },
  PasswordInput: {
    keyboard: [
      { keys: 'Tab', action: 'Moves focus from the input to the show and hide button.' },
      { keys: 'Enter / Space', action: 'Shows or hides the password when the button has focus.' },
    ],
    notes: [
      'The show and hide button is labeled “Show password” or “Hide password” to match the current state.',
      'The requirements list describes the input through `aria-describedby`, and each requirement reads as met or not met. As you type, a polite live region announces only the requirements that changed.',
      'In `hintPlacement="popover"`, the list opens when the input takes focus and closes when it loses focus.',
      'It is built on `Input`, so `Field` labels it the same way.',
    ],
  },
  Editable: {
    keyboard: [
      { keys: 'Enter', action: 'Opens the input from the preview.' },
      {
        keys: 'Space',
        action: "Opens the input from the preview when `activationMode` is `'click'`.",
      },
      { keys: 'Enter', action: "Saves the edit when `submitMode` is `'enter'` or `'both'`." },
      { keys: 'Escape', action: 'Drops the edit and closes the input.' },
      { keys: 'Tab', action: 'Saves or drops the edit as focus leaves, following `submitMode`.' },
    ],
    notes: [
      'The preview is a native `button`. With `aria-label` or `aria-labelledby` the label is its name and its text its description ("Notes, button, Pressure low"); without one, its text is its name.',
      'Opening moves focus into the input and selects its text when `selectOnFocus` is on. Closing with Enter or Escape moves focus back to the preview; leaving with Tab keeps focus where it went.',
      'In a Textarea passed to `#edit`, Enter adds a new line and Cmd or Ctrl with Enter saves. Focus moving to `#actions` or a picker panel inside the edit does not count as leaving.',
      '`aria-label` and `aria-labelledby` name the preview and the built-in input; other attributes go to the wrapper. A control you pass in `#edit` needs its own label.',
    ],
  },
  ColorPicker: {
    keyboard: [
      { keys: 'Enter / Space', action: 'Opens or closes the panel from the swatch.' },
      {
        keys: 'Tab',
        action: 'Moves focus from the swatch into the panel and through its controls.',
      },
      {
        keys: 'Shift + Tab',
        action: 'Moves focus back, closing the panel when it leaves the first control.',
      },
      { keys: 'Escape', action: 'Closes the panel.' },
      {
        keys: 'ArrowLeft / ArrowRight',
        action: 'Lowers or raises saturation by 1% on the color area.',
      },
      {
        keys: 'ArrowUp / ArrowDown',
        action: 'Raises or lowers brightness by 1% on the color area.',
      },
      { keys: 'ArrowRight / ArrowUp', action: 'Raises the hue by 1° on the hue slider.' },
      { keys: 'ArrowLeft / ArrowDown', action: 'Lowers the hue by 1° on the hue slider.' },
      { keys: 'PageUp / PageDown', action: 'Raises or lowers the hue by 10°.' },
      { keys: 'Home / End', action: 'Sets the hue to 0° or 360°.' },
    ],
    notes: [
      'The swatch is a `button` with `aria-haspopup="dialog"` and `aria-expanded`. The `label` prop (default “Color”) names both the swatch and the panel, which has `role="dialog"`. Label a custom `#trigger` yourself.',
      'Opening keeps focus on the swatch. Tabbing past the last panel control closes the panel and moves on. Closing it while focus is inside returns focus to the swatch.',
      'The color area is a `role="slider"` with an `aria-valuetext` that reads saturation and brightness; hold Shift for 10% steps. The hue slider, the hex field and the eyedropper button have labels, and presets use `aria-pressed`.',
      'Right to left, ArrowLeft and ArrowRight swap on the hue slider, and its hues run from the right. On the color area they keep their direction, because saturation always runs left to right.',
    ],
  },
  Checkbox: {
    pattern: { name: 'Checkbox', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/' },
    keyboard: [{ keys: 'Space', action: 'Checks or unchecks it.' }],
    notes: [
      'A native checkbox inside a `<label>`, so the `label` prop or the default slot names it.',
      '`indeterminate` sets the native mixed state, which screen readers announce.',
      'Inside a `Field`, the description and error are linked with `aria-describedby`, and it sets `aria-invalid` and `aria-required`.',
      '`id` and `aria-*` attributes you pass go to the input.',
    ],
  },
  Radio: {
    pattern: { name: 'Radio Group', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/radio/' },
    keyboard: [{ keys: 'Space', action: 'Selects the focused radio.' }],
    notes: [
      'A native radio inside a `<label>`; the `label` prop or default slot names it, and `description` is read as part of that name.',
      'It must sit inside a `RadioGroup`, which shares one `name` across its radios. The arrow keys come from the group.',
      '`id` and `aria-*` attributes you pass go to the input.',
    ],
  },
  RadioGroup: {
    pattern: { name: 'Radio Group', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/radio/' },
    keyboard: [
      { keys: 'Tab', action: 'Moves focus into the group, onto the selected radio.' },
      { keys: 'ArrowDown / ArrowRight', action: 'Selects the next radio.' },
      { keys: 'ArrowUp / ArrowLeft', action: 'Selects the previous radio.' },
      { keys: 'Space', action: 'Selects the focused radio.' },
    ],
    notes: [
      'A `div` with `role="radiogroup"` around native radios that share one `name`, so the browser handles the arrow keys.',
      'Inside a `Field`, the label names the group with `aria-labelledby`, and the description and error are linked with `aria-describedby`. Outside one, give it an `aria-label`.',
      'It sets `aria-invalid` and `aria-required` from the `Field`.',
    ],
  },
  Switch: {
    pattern: { name: 'Switch', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/switch/' },
    keyboard: [{ keys: 'Space', action: 'Turns it on or off.' }],
    notes: [
      'A native checkbox with `role="switch"` and `aria-checked`, inside a `<label>`, so the `label` prop or the default slot names it.',
      'Inside a `Field`, the description and error are linked with `aria-describedby`, and it sets `aria-invalid` and `aria-required`.',
      '`id` and `aria-*` attributes you pass go to the input.',
    ],
  },
  Slider: {
    pattern: { name: 'Slider', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/slider/' },
    keyboard: [
      { keys: 'ArrowRight / ArrowUp', action: 'Increases the value by one step.' },
      { keys: 'ArrowLeft / ArrowDown', action: 'Decreases the value by one step.' },
      { keys: 'PageUp', action: 'Increases the value by ten steps.' },
      { keys: 'PageDown', action: 'Decreases the value by ten steps.' },
      { keys: 'Home', action: 'Sets the value to `min`.' },
      { keys: 'End', action: 'Sets the value to `max`.' },
    ],
    notes: [
      'Each thumb has `role="slider"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`, plus `aria-orientation="vertical"` when vertical and `aria-invalid` when invalid. `valueText` sets `aria-valuetext`, such as a price with its currency.',
      'In a range, the thumbs are named “Minimum” and “Maximum” after the label. Each thumb’s `aria-valuemin` or `aria-valuemax` stops at the other thumb.',
      'Inside a `Field`, the label names the thumbs. Without one, pass `aria-label`: it moves from the wrapper to the thumbs, as `aria-describedby` does.',
      'Pressing the track moves the nearest thumb there and focuses it. Right to left, ArrowLeft and ArrowRight swap; a vertical slider keeps its keys.',
    ],
  },
  Knob: {
    pattern: { name: 'Slider', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/slider/' },
    keyboard: [
      { keys: 'ArrowRight / ArrowUp', action: 'Increases the value by one step.' },
      { keys: 'ArrowLeft / ArrowDown', action: 'Decreases the value by one step.' },
      { keys: 'PageUp', action: 'Increases the value by ten steps.' },
      { keys: 'PageDown', action: 'Decreases the value by ten steps.' },
      { keys: 'Home', action: 'Sets the value to `min`.' },
      { keys: 'End', action: 'Sets the value to `max`.' },
    ],
    notes: [
      'The dial has `role="slider"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`, and `aria-invalid` when invalid. Pass `valueText` to set `aria-valuetext`.',
      'Inside a `Field`, the label names the dial. Without one, pass `aria-label`: it moves from the wrapper to the dial.',
      'Pressing the dial focuses it.',
      'The arrow keys don’t swap right to left.',
    ],
  },
  Rating: {
    pattern: { name: 'Slider', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/slider/' },
    keyboard: [
      { keys: 'ArrowRight / ArrowUp', action: 'Adds one star, or half a star with `allowHalf`.' },
      {
        keys: 'ArrowLeft / ArrowDown',
        action: 'Removes one star, or half a star with `allowHalf`.',
      },
      { keys: 'Home', action: 'Sets the rating to 0.' },
      { keys: 'End', action: 'Sets the rating to `max`.' },
    ],
    notes: [
      'The rating is one focusable element with `role="slider"`, not a group of radio buttons. `aria-valuetext` reads “3 of 5” by default; change it with `valueText` or the `rating.valueText` message.',
      '`readonly` sets `aria-readonly`. The rating stays focusable but ignores keys and the pointer. The hover preview is visual only: screen readers hear the committed value.',
      'Inside a `Field`, the label and description are linked, and `error` sets `aria-invalid`. Without one, pass `aria-label`.',
      'Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  Field: {
    keyboard: [],
    notes: [
      'The `<label>` points at the control with `for`. Controls without a native input, such as Select, Slider and Rating, use `aria-labelledby` instead. Without a `label`, nothing is linked, so name the control yourself.',
      'The description and the error are linked to the control with `aria-describedby`. The error renders with `role="alert"`, so screen readers announce it when it appears.',
      'While `error` is set, the control gets `aria-invalid="true"`. `required` sets `aria-required`, and the asterisk isn’t part of the accessible name.',
      'Controls in `#prepend` and `#append` aren’t named by the label: give each one an `aria-label`.',
    ],
  },
  Select: {
    pattern: { name: 'Combobox', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/' },
    keyboard: [
      { keys: 'ArrowDown / ArrowUp / Enter / Space', action: 'Opens the list when it’s closed.' },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves the highlight to the next or previous option, wrapping at the ends.',
      },
      { keys: 'Home / End', action: 'Moves the highlight to the first or last option.' },
      {
        keys: 'Enter / Space',
        action: 'Selects the highlighted option, or toggles it with `multiple`.',
      },
      {
        keys: 'A letter',
        action: 'Moves the highlight to the next option whose label starts with the typed letters.',
      },
      { keys: 'Backspace / Delete', action: 'Removes the last chip, with `multiple`.' },
      { keys: 'Escape', action: 'Closes the list and puts focus on the trigger.' },
      { keys: 'Tab', action: 'Closes the list and moves focus on.' },
    ],
    notes: [
      'The trigger has `role="combobox"` with `aria-haspopup="listbox"`, `aria-expanded` and `aria-controls`. Options have `role="option"` and `aria-selected`; `multiple` adds `aria-multiselectable`, and a virtualized list adds `aria-setsize` and `aria-posinset`. Groups render as `role="group"`, named by their label.',
      'Focus stays on the trigger, and `aria-activedescendant` points at the highlighted option, starting on the selected one. With `filter`, focus moves to the search box, which becomes the combobox; Space types a space there.',
      'A single select closes when you pick; `multiple` stays open. Chip remove buttons are pointer only. The clear button is a Tab stop, and clearing puts focus back on the trigger.',
      'Inside a `Field`, the label names the trigger. Without one, pass `aria-label` or `aria-labelledby`.',
    ],
  },
  Combobox: {
    pattern: { name: 'Combobox', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/' },
    keyboard: [
      {
        keys: 'A letter',
        action: 'Types into the input and opens the list, filtered to the matches.',
      },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Opens the list, then moves the highlight, wrapping at the ends.',
      },
      {
        keys: 'Home / End',
        action: 'Moves the highlight to the first or last option while the list is open.',
      },
      {
        keys: 'Enter',
        action:
          'Selects or toggles the highlighted option; with `allowCustom` and none highlighted, adds the typed text.',
      },
      { keys: 'Escape', action: 'Closes the list and puts back the selected label if you typed.' },
      { keys: 'Backspace', action: 'Removes the last chip when the input is empty (`multiple`).' },
      { keys: 'Delete / Backspace', action: 'Removes the focused chip.' },
      {
        keys: 'Tab',
        action:
          'Closes the list and moves focus on; with `tabBehavior`, it commits the highlighted option or the typed text first.',
      },
    ],
    notes: [
      'The input has `role="combobox"` with `aria-autocomplete="list"`, `aria-expanded` and `aria-controls`. Options have `role="option"` and `aria-selected`, plus `aria-setsize` and `aria-posinset` in a virtualized list.',
      'Focus stays in the input, and `aria-activedescendant` points at the highlighted option. The list opens on focus unless `openOnFocus` is `false`.',
      'Chips sit outside the input and are Tab stops. When a focused chip is removed, focus moves to the next chip, the previous one, or the input. Clear returns focus to the input.',
      'Inside a `Field`, the label names the input. Without one, pass `aria-label`.',
    ],
  },
  CascadeSelect: {
    pattern: { name: 'Menu Button', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/' },
    keyboard: [
      { keys: 'ArrowDown / ArrowUp / Enter / Space', action: 'Opens the menu from the trigger.' },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves focus to the next or previous option in the level, wrapping at the ends.',
      },
      { keys: 'Home / End', action: 'Moves focus to the first or last option in the level.' },
      {
        keys: 'ArrowRight',
        action: 'Opens the next level of a parent option and focuses its first option.',
      },
      {
        keys: 'ArrowLeft',
        action: 'Closes the current level and returns focus to its parent option.',
      },
      {
        keys: 'Enter / Space',
        action: 'Selects the focused option, or opens the next level of a parent option.',
      },
      {
        keys: 'A letter',
        action: 'Moves focus to the next option whose label starts with the typed letters.',
      },
      {
        keys: 'Backspace / Delete',
        action: 'Removes the last chip from the focused trigger, with `multiple`.',
      },
      { keys: 'Escape', action: 'Closes the innermost open level.' },
    ],
    notes: [
      'The trigger is a menu button: `role="button"` with `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`, read as its label followed by the value. Chip remove buttons inside it are pointer only, and the clear button is a Tab stop.',
      'Each level is a `role="menu"` named by what opened it. Options are `menuitem`s, or `menuitemcheckbox`es with `aria-checked` in `multiple`; parent options add `aria-haspopup` and `aria-expanded`. A single pick closes the menu; `multiple` keeps it open.',
      'Focus moves into the menu on open, to the selected option’s path or the first option, and returns to the trigger on close or clear. With `filter`, focus starts in the search box: ArrowDown moves to the results, Enter picks the first one, and typing or Backspace on a result goes back to the search box.',
      'Inside a `Field`, the label names the trigger. Without one, pass `aria-label` or `aria-labelledby`; the value is still read after it. Right to left, ArrowLeft and ArrowRight swap, and levels open to the left.',
    ],
  },
  Tree: {
    pattern: { name: 'Tree View', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/treeview/' },
    keyboard: [
      { keys: 'ArrowDown / ArrowUp', action: 'Moves focus to the next or previous visible row.' },
      { keys: 'Home / End', action: 'Moves focus to the first or last visible row.' },
      {
        keys: 'ArrowRight',
        action: 'Expands a closed folder, or moves focus to the first child of an open one.',
      },
      { keys: 'ArrowLeft', action: 'Collapses an open folder, or moves focus to the parent row.' },
      { keys: 'Enter / Space', action: 'Selects or checks the focused row.' },
      {
        keys: 'A letter',
        action: 'Moves focus to the next row whose label starts with the typed letters.',
      },
      { keys: 'ArrowDown', action: 'Moves focus from the search box to the first row.' },
      { keys: 'Space', action: 'Picks up the focused row when `reorderable` is set.' },
      { keys: 'ArrowUp / ArrowDown', action: 'Moves the picked-up row up or down.' },
      { keys: 'ArrowLeft / ArrowRight', action: 'Moves the picked-up row one level out or in.' },
      { keys: 'Space / Enter', action: 'Drops the picked-up row.' },
      { keys: 'Escape', action: 'Cancels the move and puts the row back.' },
    ],
    notes: [
      '`role="tree"` holds `role="treeitem"` rows with `aria-level`, `aria-setsize` and `aria-posinset`; folders add `aria-expanded`. `aria-label`, `aria-labelledby` and `aria-describedby` go on the tree.',
      'Rows carry `aria-selected`, or `aria-checked` in `checkbox` mode, with `"mixed"` for a partly checked folder. `aria-multiselectable` is set unless the mode is `single`.',
      'One row is in the tab order at a time, starting on the selected row; in `checkbox` mode the checkboxes stay out of it. The exposed `focusNode(value)` opens the folders above a row and focuses it. Typing the same letter again cycles through matches.',
      'With `reorderable`, Space picks a row up instead of selecting it; Enter still selects. Each move is announced through a `role="status"` live region. Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  TreeSelect: {
    keyboard: [
      { keys: 'ArrowDown / ArrowUp / Enter / Space', action: 'Opens the tree from the trigger.' },
      { keys: 'ArrowDown / ArrowUp', action: 'Moves focus to the next or previous visible row.' },
      { keys: 'Home / End', action: 'Moves focus to the first or last visible row.' },
      {
        keys: 'ArrowRight',
        action: 'Expands a closed folder, or moves focus to the first child of an open one.',
      },
      { keys: 'ArrowLeft', action: 'Collapses an open folder, or moves focus to the parent row.' },
      { keys: 'Enter / Space', action: 'Selects or checks the focused row.' },
      {
        keys: 'A letter',
        action: 'Moves focus to the next row whose label starts with the typed letters.',
      },
      { keys: 'Escape', action: 'Closes the panel and returns focus to the trigger.' },
    ],
    notes: [
      'The trigger has `role="combobox"` with `aria-haspopup="tree"`, `aria-expanded` and `aria-controls` pointing at the tree. The tree has the same roles as Tree and takes the trigger’s label.',
      'On open, focus moves to the selected row, opening the folders above it, or else to the first row. With `filterable`, it moves to the search box. A single selection closes the panel; `multiple` and `checkbox` keep it open.',
      'The clear button is a Tab stop, and clearing puts focus back on the trigger.',
      'Inside a `Field`, the label names the trigger. Without one, pass `aria-label` or `aria-labelledby`. Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  Calendar: {
    pattern: { name: 'Grid', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/grid/' },
    keyboard: [
      { keys: 'ArrowLeft / ArrowRight', action: 'Moves focus one day back or forward.' },
      { keys: 'ArrowUp / ArrowDown', action: 'Moves focus one week back or forward.' },
      { keys: 'Home / End', action: 'Moves focus to the first or last day of the week.' },
      { keys: 'PageUp / PageDown', action: 'Moves focus one month back or forward.' },
      {
        keys: 'Shift + PageUp / Shift + PageDown',
        action: 'Moves focus one year back or forward.',
      },
      { keys: 'Enter / Space', action: 'Selects the focused day.' },
      {
        keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown',
        action: 'Moves focus one cell or one row in the month and year views.',
      },
      {
        keys: 'Home / End',
        action: 'Moves focus to the first or last cell in the row, in the month and year views.',
      },
      {
        keys: 'PageUp / PageDown',
        action:
          'Moves focus a year back or forward in the month view, or 12 years in the year view.',
      },
      {
        keys: 'Enter / Space',
        action: 'Picks the focused month or year, and moves focus into the next view.',
      },
    ],
    notes: [
      'Each month is a `role="grid"` named by its month and year. Days are `gridcell`s with the full date as `aria-label`, plus `aria-selected`, `aria-current="date"` for today and `aria-disabled`. With `showWeekNumbers`, each row starts with a `rowheader`, such as “Week 12”.',
      'One cell is in the tab order at a time (roving tabindex). Moving past the shown month pages the calendar. In a range, every day from the start to the end has `aria-selected`.',
      'The previous and next buttons use `aria-disabled` at `minDate` and `maxDate`, so they keep focus. The month label is an `aria-live="polite"` button, so paging announces the new month.',
      'With a `#day` slot, the full date is read from visually hidden text before your content. Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  DatePicker: {
    pattern: { name: 'Combobox', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/' },
    keyboard: [
      { keys: 'A letter / A digit / Space', action: 'Types a date into the input.' },
      {
        keys: 'ArrowDown',
        action: 'Opens the calendar and focuses the selected day, or today.',
      },
      {
        keys: 'Enter',
        action: 'Commits the typed date, or opens or closes the calendar when nothing was typed.',
      },
      {
        keys: 'Escape',
        action: 'Closes the calendar, or else undoes what you typed in the input.',
      },
      {
        keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown',
        action: 'Moves focus by a day or a week in the calendar.',
      },
      {
        keys: 'Home / End / PageUp / PageDown',
        action: 'Moves focus by week edge or month in the calendar, as in Calendar.',
      },
      { keys: 'Enter / Space', action: 'Selects the focused day and closes the calendar.' },
      { keys: 'ArrowUp / ArrowDown', action: 'Steps the focused hour or minute field.' },
      {
        keys: 'Home / End',
        action: 'Sets the focused hour or minute field to its lowest or highest value.',
      },
      { keys: 'Enter', action: 'Closes the calendar from the hour or minute field.' },
    ],
    notes: [
      'The input has `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`. It reads typed dates in the locale’s order, or as `yyyy-mm-dd`. Enter or leaving the field commits; an entry that doesn’t read keeps the last value and sets `aria-invalid`.',
      'It opens on click, ArrowDown, Enter or the calendar button, not on focus. A click keeps focus in the input for typing; the keys and the button move it to the calendar, and closing returns it to the input. The button is named “Choose date” and is out of the tab order.',
      'The panel is a non-modal `role="dialog"` named “Choose date” (the `datePicker.chooseDate` message). A range stays open until both ends are set, and `showTime` stays open for the time. The hour and minute fields are `role="spinbutton"` inputs.',
      'Inside a `Field`, the label names the input and `error` sets `aria-invalid`. Without one, pass `aria-label`. Right to left, ArrowLeft and ArrowRight swap in the calendar.',
    ],
  },
  FileUpload: {
    keyboard: [
      { keys: 'Enter / Space', action: 'Opens the file picker from the Browse button.' },
      { keys: 'Enter / Space', action: 'Removes the file from its remove button.' },
    ],
    notes: [
      'The native file input is visually hidden and out of the tab order. The Browse button is the keyboard entry point; the drop zone isn’t focusable. Cmd or Ctrl with V pastes files while focus is inside it.',
      'Each remove button is named “Remove” plus the file name. After a removal, focus moves to the next row’s button, the previous one, or the Browse button.',
      'Rejected files are announced through a polite live region, such as “photo.png wasn’t added: it’s too large.”, and set `aria-invalid`.',
      'Inside a `Field`, the Browse button reads the label, then “Browse files”, and the description and error describe it. Outside a `Field`, it reads “Browse files”.',
    ],
  },
  Dialog: {
    pattern: {
      name: 'Dialog (modal)',
      url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
    },
    keyboard: [
      { keys: 'Escape', action: 'Closes the dialog, unless `closeOnEsc` is `false`.' },
      {
        keys: 'Tab',
        action:
          'Moves focus to the next element in the dialog, wrapping from the last to the first.',
      },
      {
        keys: 'Shift + Tab',
        action:
          'Moves focus to the previous element in the dialog, wrapping from the first to the last.',
      },
    ],
    notes: [
      'The panel has `role="dialog"`, or `role="alertdialog"` with the `role` prop, and `aria-modal="true"` while modal. `title` wires `aria-labelledby` and `description` wires `aria-describedby`.',
      'Without `title`, such as with a custom `#header`, pass `aria-label` or `aria-labelledby`: attributes go on the panel. The close and maximize buttons have built-in, translated labels.',
      'On open, focus moves to `initialFocus()`, else the first focusable element, else the panel. On close, focus returns to the element that opened it. `modal: false` turns off the focus trap, the inert page and both focus moves.',
      'Escape closes only the topmost layer. While modal, the rest of the page, or of the `container`, is `inert`; toasts, live regions, tooltips and overlays opened from inside stay usable.',
    ],
  },
  Drawer: {
    pattern: {
      name: 'Dialog (modal)',
      url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
    },
    keyboard: [
      { keys: 'Escape', action: 'Closes the drawer, unless `closeOnEsc` is `false`.' },
      {
        keys: 'Tab',
        action:
          'Moves focus to the next element in the drawer, wrapping from the last to the first.',
      },
      {
        keys: 'Shift + Tab',
        action:
          'Moves focus to the previous element in the drawer, wrapping from the first to the last.',
      },
    ],
    notes: [
      'Drawer is a Dialog anchored to an edge, so it has the same roles, labels, focus behavior and inert page.',
      '`title` wires `aria-labelledby` and `description` wires `aria-describedby`. Without `title`, pass `aria-label`.',
      'Focus moves into the drawer on open and returns to the element that opened it on close.',
    ],
  },
  BottomSheet: {
    pattern: {
      name: 'Dialog (modal)',
      url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
    },
    keyboard: [
      { keys: 'Escape', action: 'Closes the sheet, unless `closeOnEsc` is `false`.' },
      {
        keys: 'Tab',
        action:
          'Moves focus to the next element in the sheet, wrapping from the last to the first.',
      },
      {
        keys: 'Shift + Tab',
        action:
          'Moves focus to the previous element in the sheet, wrapping from the first to the last.',
      },
      {
        keys: 'ArrowUp / ArrowDown',
        action: 'Moves the sheet to the next larger or smaller snap point, from the drag handle.',
      },
    ],
    notes: [
      'Built on Dialog: the panel has `role="dialog"` and `aria-modal="true"`, with the same focus trap, focus return and inert page.',
      '`title` names the sheet through `aria-labelledby`. Without it, or with a custom `#header`, pass `aria-label`; it goes on the panel.',
      'With more than one snap point, the drag handle is a button named “Resize sheet”, and opening focuses the first control after it. With one, the handle is `aria-hidden`.',
      'The header’s close button has a built-in, translated label.',
    ],
  },
  Popover: {
    keyboard: [
      { keys: 'Escape', action: 'Closes the popover, unless `closeOnEsc` is `false`.' },
      {
        keys: 'Tab',
        action:
          'Moves focus from the trigger into the panel; past the last element, it closes the panel and moves to the element after the trigger.',
      },
      {
        keys: 'Shift + Tab',
        action:
          'Moves focus from the first element in the panel back to the trigger and closes the panel.',
      },
    ],
    notes: [
      'The panel has no role and isn’t a focus trap. For interactive content, pass `role="dialog"` and an `aria-label`; attributes go on the panel.',
      'A button in the `#trigger` slot gets `aria-expanded`, and `aria-controls` while open. A trigger passed with `triggerEl` gets neither.',
      'Opening doesn’t move focus. If focus is in the panel when it closes, it returns to the trigger.',
      'Moving focus outside the panel closes it, unless `closeOnOutside` is `false`.',
    ],
  },
  Tooltip: {
    pattern: { name: 'Tooltip', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/' },
    keyboard: [
      {
        keys: 'Tab',
        action:
          'Opens the tooltip when keyboard focus reaches the trigger, and closes it when focus leaves.',
      },
      { keys: 'Escape', action: 'Closes the tooltip without closing a dialog or menu around it.' },
    ],
    notes: [
      'The panel has `role="tooltip"`. While it’s open, the trigger’s `aria-describedby` includes its id, and your own ids stay.',
      'It opens on `:focus-visible` only, so a mouse click doesn’t open it. On touch, a 500 ms long press opens it.',
      'The tooltip describes the trigger but doesn’t name it. An icon-only trigger still needs an `aria-label`.',
      'The trigger must be focusable for keyboard users to reach the tooltip.',
    ],
  },
  ContextMenu: {
    pattern: { name: 'Menu', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menubar/' },
    keyboard: [
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves focus to the next or previous item, wrapping at the ends.',
      },
      { keys: 'Home / End', action: 'Moves focus to the first or last item.' },
      { keys: 'Enter / Space', action: 'Activates the focused item, or opens its submenu.' },
      {
        keys: 'ArrowRight',
        action: 'Opens the focused item’s submenu and focuses its first item.',
      },
      { keys: 'ArrowLeft', action: 'Closes the submenu and returns focus to its parent item.' },
      {
        keys: 'A letter',
        action: 'Moves focus to the next item whose label starts with the typed letters.',
      },
      { keys: 'Escape', action: 'Closes the open submenu, or the menu.' },
    ],
    notes: [
      'It opens on the native `contextmenu` event, and the panel is a Menu with the same roles and keys.',
      'Browsers also fire `contextmenu` from the keyboard on a focused element, so put something focusable inside. To open it from your own button, call the exposed `openAt(x, y)`. Pass `aria-label` to name the menu.',
      'Focus moves to the first item on open. On close, it returns to what had it, or to the element you right-clicked.',
      'Right to left, ArrowLeft and ArrowRight swap, and submenus open to the left.',
    ],
  },
  CommandPalette: {
    pattern: { name: 'Combobox', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/' },
    keyboard: [
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Highlights the next or previous enabled item, wrapping at the ends.',
      },
      {
        keys: 'Enter',
        action:
          'Selects the highlighted item and closes the palette, unless `closeOnSelect` is `false`.',
      },
      { keys: 'Escape', action: 'Closes the palette, unless `closeOnEsc` is `false`.' },
      {
        keys: 'Tab / Shift + Tab',
        action: 'Moves focus within the palette, wrapping at the ends.',
      },
    ],
    notes: [
      'A modal Dialog, so the rest of the page is `inert`. A translated “Command palette” label names both the dialog and the search input. Focus goes to the input on open and returns to the opener on close.',
      'The input has `role="combobox"` and `aria-controls` pointing at a `role="listbox"`. Items are `role="option"` with `aria-selected`, and `aria-disabled` when disabled. Groups are `role="group"`, named by their headings.',
      'Focus stays in the input; `aria-activedescendant` points at the highlighted item. As you type, a `role="status"` region announces the number of results, or that there are none.',
      '`shortcut`, such as `"mod+k"`, toggles the palette from anywhere on the page.',
    ],
  },
  Tour: {
    keyboard: [
      { keys: 'ArrowRight', action: 'Goes to the next step.' },
      { keys: 'ArrowLeft', action: 'Goes to the previous step.' },
      {
        keys: 'Tab / Shift + Tab',
        action: 'Moves focus within the callout, wrapping at the ends, when `modal` is on.',
      },
      {
        keys: 'Escape',
        action: 'Ends the tour and fires `@skip`, unless `closeOnEsc` is `false`.',
      },
    ],
    notes: [
      'The callout has `role="dialog"` and an `aria-label` from the step’s `title`, else the translated “Step {current} of {total}”. With `modal`, it also sets `aria-modal`.',
      'Focus moves to the first focusable element in the callout on open and on every step change. When the tour ends, focus returns to the element that started it.',
      'With `modal` (default), everything but the target and the callout is `inert`, and Tab stays inside the callout.',
      'Arrow keys are ignored while focus is in a field or a widget that uses them, and `keyboardNav: false` turns them off. Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  Menu: {
    pattern: { name: 'Menu Button', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/' },
    keyboard: [
      {
        keys: 'Enter / Space',
        action: 'Opens the menu from the trigger and focuses the first item.',
      },
      { keys: 'ArrowDown', action: 'Opens the menu from the trigger and focuses the first item.' },
      { keys: 'ArrowUp', action: 'Opens the menu from the trigger and focuses the last item.' },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves focus to the next or previous item, wrapping at the ends.',
      },
      { keys: 'Home / End', action: 'Moves focus to the first or last item.' },
      {
        keys: 'Enter / Space',
        action: 'Activates the focused item and closes the menu, or opens its submenu.',
      },
      {
        keys: 'ArrowRight',
        action: 'Opens the focused item’s submenu and focuses its first item.',
      },
      { keys: 'ArrowLeft', action: 'Closes the submenu and returns focus to its parent item.' },
      {
        keys: 'A letter',
        action: 'Moves focus to the next item whose label starts with the typed letters.',
      },
      {
        keys: 'Escape',
        action: 'Closes the open submenu, or the menu, and returns focus to its trigger.',
      },
      { keys: 'Tab', action: 'Closes the menu and moves focus to the element after the trigger.' },
    ],
    notes: [
      'The trigger gets `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` while open. The list has `role="menu"` and is named by its trigger, and a submenu by its row.',
      'Rows are `role="menuitem"`, or `role="menuitemcheckbox"` with `aria-checked` when `checked` is set. Submenu rows add `aria-haspopup` and `aria-expanded`.',
      'Items use a roving `tabindex`, and disabled items are skipped. With the default slot, render your own `role="menuitem"` elements.',
      'Right to left, ArrowLeft and ArrowRight swap, and submenus open to the left.',
    ],
  },
  MenuList: {
    keyboard: [
      { keys: 'Tab', action: 'Moves focus into the list and out of it; the list is one Tab stop.' },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves focus to the next or previous row, wrapping at the ends.',
      },
      { keys: 'Home / End', action: 'Moves focus to the first or last row.' },
      { keys: 'Enter / Space', action: 'Activates the focused row.' },
      {
        keys: 'A letter',
        action: 'Moves focus to the next row whose label starts with the typed letters.',
      },
    ],
    notes: [
      'Renders a `<nav>` landmark with native buttons or links, not menu roles. Pass `aria-label` when the page has more than one `<nav>`.',
      'The row whose `value` matches `active` gets `aria-current="page"`.',
      'Group labels are plain text and aren’t focusable. Separators have `role="separator"`.',
    ],
  },
  Tabs: {
    pattern: { name: 'Tabs', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/' },
    keyboard: [
      {
        keys: 'ArrowRight / ArrowLeft',
        action:
          'Moves to the next or previous tab, wrapping at the ends and skipping disabled tabs.',
      },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves to the next or previous tab when `orientation` is `vertical`.',
      },
      { keys: 'Home / End', action: 'Moves to the first or last enabled tab.' },
      { keys: 'Enter / Space', action: 'Selects the focused tab when `activation` is `manual`.' },
    ],
    notes: [
      'The root has `role="tablist"`, with `aria-orientation="vertical"` when vertical. Attributes such as `aria-label` go on it.',
      '`itemProps(item)` gives each tab `role="tab"`, `aria-selected`, an `id` and a roving `tabindex`. In `automatic` mode, arrow keys select as they move.',
      'Set `idBase` so tabs get `aria-controls`, and spread the exposed `panelProps(value)` on each panel for `role="tabpanel"`, `aria-labelledby` and `tabindex="0"`.',
      'Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  Stepper: {
    keyboard: [
      { keys: 'Tab / Shift + Tab', action: 'Moves focus between the steps you can go to.' },
      { keys: 'Enter / Space', action: 'Goes to the focused step.' },
    ],
    notes: [
      'Renders an `<ol>`; the current step has `aria-current="step"`, and completed steps read “Completed” after their label. Connector lines are `aria-hidden`.',
      'Steps are native buttons. With `linear`, steps you haven’t reached are `disabled` and can’t take focus.',
      '`clickable: false` renders plain elements; if the row overflows, the list becomes a Tab stop so you can scroll it.',
    ],
  },
  Breadcrumb: {
    pattern: { name: 'Breadcrumb', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/' },
    keyboard: [{ keys: 'Tab / Shift + Tab', action: 'Moves focus between the crumb links.' }],
    notes: [
      'Renders a `<nav>` landmark labeled with a translated “Breadcrumb”; `ariaLabel` overrides it. The crumbs are an `<ol>`.',
      'The current crumb, the last one by default, is plain text with `aria-current="page"`, not a link.',
      'Separators and item icons are `aria-hidden`.',
      'Give each link an `href`, or `to` for a router link, through `attrs` or on `BreadcrumbItem`.',
    ],
  },
  DataTable: {
    pattern: { name: 'Table', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/table/' },
    keyboard: [
      {
        keys: 'Enter / Space',
        action:
          'Cycles a sortable column through ascending, descending and unsorted, from its header button.',
      },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves focus to the next or previous row, with `selectionMode="row"`.',
      },
      {
        keys: 'Home / End',
        action: 'Moves focus to the first or last row, with `selectionMode="row"`.',
      },
      { keys: 'Space', action: 'Selects or clears the focused row, with `selectionMode="row"`.' },
      {
        keys: 'Enter',
        action:
          'Selects or clears the focused row and fires `row-click`, with `selectionMode="row"`.',
      },
      {
        keys: 'Shift + ArrowDown / Shift + ArrowUp',
        action:
          'Adds the focused row and the next or previous row to the selection, unless `single` is set.',
      },
      {
        keys: 'Enter / Space',
        action: "Shows or hides a row's expansion, from its expand button.",
      },
      {
        keys: 'ArrowLeft / ArrowRight',
        action: 'Narrows or widens the column by 16 px, from its focused resize handle.',
      },
      {
        keys: 'Alt + ArrowLeft / Alt + ArrowRight',
        action: 'Moves a reorderable column one place, from its header.',
      },
    ],
    notes: [
      'Sortable column headers set `aria-sort` to `ascending`, `descending` or `none`, and the header label is a `<button>`. The expand button has `aria-expanded`, and `aria-controls` while open.',
      'With row selection, the table is a `role="grid"` and rows carry `aria-selected`. With `selectionMode="row"`, rows are one Tab stop with a roving `tabindex`, and keys inside a cell’s own controls stay with them. In checkbox mode, each row’s Checkbox (a Radio with `single`) is named after its row, such as “Select row Alice”.',
      'Resize handles are focusable `role="separator"` elements. An always-mounted `role="status"` region announces new column widths and positions, and reads “Loading…” while `loading` sets `aria-busy`.',
      'With `scrollHeight`, the head and body are separate tables, so ARIA roles rebuild one table for screen readers. Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  Pagination: {
    keyboard: [
      {
        keys: 'Tab / Shift + Tab',
        action: 'Moves between the page buttons and the page size Select.',
      },
      {
        keys: 'Enter / Space',
        action: 'Goes to the focused page, or to the first, previous, next or last page.',
      },
    ],
    notes: [
      'The root is a `<nav>` named “Pagination”, and the buttons sit in a `<ul>`.',
      'The current page button has `aria-current="page"`, and each page button is named “Page 3”, “Page 4” and so on.',
      'The first, previous, next and last buttons have their own names. At either end they set `aria-disabled`, so they keep focus.',
      'The ellipsis, the indicator and the hover highlight are `aria-hidden`. The page size Select is named “Rows per page”.',
    ],
  },
  Card: {
    keyboard: [],
    notes: [
      'Card renders a `<div>` with no role and no keyboard handling.',
      'For a clickable card, set `as="a"` (with an `href`) or `as="button"`, so it is focusable and works with the keyboard. `interactive` on its own adds only the hover and press look.',
      'The `title` prop renders an `<h3>`. Use the `#header` slot when your page outline needs another heading level.',
      'The header and footer are plain `<div>`s, so they add no landmarks.',
    ],
  },
  Avatar: {
    keyboard: [],
    notes: [
      'The image takes its `alt` from `alt`, then `name`. Without either, `alt` is empty and screen readers skip the image.',
      'The fallback (the initials or your default slot) is plain text. It shows while the image loads, or after it fails, and the hidden image is `aria-hidden`, so the avatar is read once.',
      'Avatar has no role and no keyboard handling. Content in the `#badge` slot is not hidden from screen readers.',
    ],
  },
  AvatarGroup: {
    keyboard: [],
    notes: [
      'The group is a `<div>` with no role. Each Avatar keeps its own `alt`.',
      'Screen readers read the overflow avatar as its text, such as “+3”. The `#overflow` slot receives `count` if you want other wording.',
    ],
  },
  Badge: {
    keyboard: [],
    notes: [
      'Badge is a `<span>` with no role, and screen readers read its count as plain text, such as “99+”.',
      'A `dot` badge renders no text. Say what it means in nearby text.',
      'It has no live region, so count changes are not announced.',
    ],
  },
  Tag: {
    keyboard: [],
    notes: [
      'Tag is a `<span>` with no role and no keyboard handling.',
      'The `#icon` slot is `aria-hidden`, so keep the meaning in the label.',
      'A `@click` or `tabindex` you add gives it the press look only. Use a Button for actions.',
    ],
  },
  Chip: {
    keyboard: [
      {
        keys: 'Delete / Backspace',
        action:
          'Fires `remove` when the chip is `removable` and focus is on the chip or its remove button.',
      },
      { keys: 'Enter / Space', action: 'Fires `remove` from the focused remove button.' },
    ],
    notes: [
      'The remove button is a `<button>` named “Remove” plus the `label`. Pass `label` even when you use the default slot, or the button is named only “Remove”.',
      'When a chip that holds focus is removed, focus moves to the next chip, the previous one, or the field of the Select, CascadeSelect or Combobox it belongs to.',
      'The chip root is not focusable on its own. Add `tabindex="0"` for Delete and Backspace to work on the chip itself.',
      'Inside an element with `role="combobox"` or `role="button"`, such as a Select trigger, the remove button is pointer only (`tabindex="-1"`, `aria-hidden`). With `disabled`, it is disabled and the keys do nothing.',
    ],
  },
  Kbd: {
    keyboard: [],
    notes: [
      'Kbd renders a native `<kbd>` element with no role and no keyboard handling. Screen readers read the text you put in it.',
    ],
  },
  AnimatedNumber: {
    keyboard: [],
    notes: [
      'The formatted value sits in visually hidden text, and the rolling digits are `aria-hidden`. Screen readers read the final value, never an in-between frame.',
      "With `{ when: 'visible' }`, the digits wait at 0 on screen, but screen readers already get the value.",
      'It has no live region, so value changes are not announced.',
    ],
  },
  AnimatedText: {
    keyboard: [],
    notes: [
      'The value is plain text in a `<span>` with no role and no live region, so changes are not announced.',
      'During a swap, the old text stays in the DOM until its leave transition ends, but it is `aria-hidden`, so screen readers find only the new text.',
    ],
  },
  Timeline: {
    keyboard: [],
    notes: [
      'Timeline renders an `<ol>` with one `<li>` per item, so screen readers announce a list and its length.',
      'The marker, including your `#marker` slot, and the connector are `aria-hidden`.',
      '`active` sets `aria-current="step"` on its item. `completed` sets only a `data-` attribute, so put that state in the item text when it matters.',
      'A timeline that overflows with nothing focusable inside becomes a Tab stop, so you can scroll it with the keyboard.',
    ],
  },
  Accordion: {
    pattern: { name: 'Accordion', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/accordion/' },
    keyboard: [
      { keys: 'Enter / Space', action: 'Opens or closes the focused section.' },
      {
        keys: 'ArrowDown / ArrowUp',
        action: 'Moves focus to the next or previous header, wrapping at the ends.',
      },
      { keys: 'Home / End', action: 'Moves focus to the first or last header.' },
    ],
    notes: [
      'Each header is a `<button>` with `aria-expanded` and `aria-controls`, inside an `<h3>`. Set `headingLevel` to match your page outline.',
      'Each panel has `role="region"` and `aria-labelledby` pointing at its header. A closed panel stays mounted as `hidden="until-found"`: out of the tab order and the accessibility tree, but the browser\'s find reaches it and opens its section. Where a browser has no `until-found`, it is `aria-hidden` and `inert` instead.',
      'A disabled item has a native `disabled` button, so Tab and the arrow keys skip it.',
      "The arrow keys move only between this Accordion's own headers, so a nested Accordion keeps its own. With `collapsible` set to `false`, the last open section stays open.",
    ],
  },
  Collapsible: {
    pattern: { name: 'Disclosure', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/' },
    keyboard: [
      { keys: 'Enter / Space', action: 'Opens or closes the panel from the trigger button.' },
    ],
    notes: [
      'Put a `<button>` in the `#trigger` slot. The first `button`, `[role="button"]` or `a[href]` in it gets `aria-expanded` and `aria-controls`.',
      'Keyboard support comes from the element you put in the slot. The wrapper around it only listens for clicks.',
      'With `disabled`, the trigger gets `aria-disabled="true"` and clicks do nothing.',
      'The panel has `role="region"`, named by the trigger. A closed panel stays mounted as `hidden="until-found"`: out of the tab order and the accessibility tree, but the browser\'s find reaches it and opens it. Where a browser has no `until-found`, it is `aria-hidden` and `inert` instead.',
    ],
  },
  Separator: {
    keyboard: [],
    notes: [
      'The root has `role="separator"`, plus `aria-orientation="vertical"` when vertical. It is not focusable.',
      'With a label, the two lines are `aria-hidden`, and the label names the separator through `aria-labelledby`.',
    ],
  },
  Resizable: {
    pattern: {
      name: 'Window Splitter',
      url: 'https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/',
    },
    keyboard: [
      {
        keys: 'ArrowLeft / ArrowRight',
        action: 'Moves the handle 16 px and resizes the panel, when `direction` is `horizontal`.',
      },
      {
        keys: 'ArrowUp / ArrowDown',
        action: 'Moves the handle 16 px and resizes the panel, when `direction` is `vertical`.',
      },
      { keys: 'Home', action: 'Sets the panel to its `min` size.' },
      { keys: 'End', action: 'Sets the panel to its `max` size, when `max` is set.' },
    ],
    notes: [
      'The handle has `role="separator"` and is a Tab stop. With `disabled`, it leaves the tab order.',
      'It sets `aria-valuenow` to the size in pixels and `aria-valuemin` to `min`. `aria-valuemax` is `max`, or the room its container gives it when there’s no `max`.',
      'The handle is named “Resize” by default (the `resizable.label` message). Pass `aria-label` to say which panel it resizes.',
      'Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  ScrollArea: {
    keyboard: [],
    notes: [
      'The viewport is a native scroller with a native scrollbar, so the browser handles scrolling keys once focus is inside it.',
      'While the content overflows and holds nothing focusable, the viewport gets `tabindex="0"`, so you can reach it with Tab.',
      '`aria-label` and `aria-labelledby` go on the viewport, which then becomes a `role="region"`. Other attributes go on the root.',
    ],
  },
  SwipeToReveal: {
    keyboard: [
      {
        keys: 'Tab / Shift + Tab',
        action:
          'Reveals an actions panel when focus moves into it, and closes it when focus leaves the row.',
      },
      { keys: 'Escape', action: 'Closes an open row without closing a dialog around it.' },
    ],
    notes: [
      'Both actions panels stay mounted and in the tab order while closed, so every action is reachable without swiping.',
      'In the DOM, the leading actions come before the row content and the trailing actions after it, so Tab follows the screen.',
      'Swiping is pointer only. Use `v-model:open`, `reveal()` or `close()` to open the actions another way.',
      'With `disabled`, the root gets `aria-disabled="true"`, and only swiping is blocked.',
    ],
  },
  PullToRefresh: {
    keyboard: [],
    notes: [
      'The pull is touch and pointer only. Call the exposed `refresh()` from a button to give keyboard and screen reader users the same action.',
      'The pull zone, with its arrow, spinner and label, is `aria-hidden`. An always-mounted `role="status"` region reads “Refreshing…” and then “Updated”.',
      'Without `scrollEl`, the root scrolls, and it becomes a Tab stop while it overflows with nothing focusable inside.',
    ],
  },
  Dock: {
    pattern: { name: 'Toolbar', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/' },
    keyboard: [
      {
        keys: 'ArrowLeft / ArrowRight',
        action: 'Moves focus to the previous or next item, wrapping at the ends, when horizontal.',
      },
      {
        keys: 'ArrowUp / ArrowDown',
        action: 'Moves focus to the previous or next item, wrapping at the ends, when vertical.',
      },
      { keys: 'Home / End', action: 'Moves focus to the first or last enabled item.' },
      { keys: 'Enter / Space', action: 'Selects the focused item.' },
    ],
    notes: [
      'The root has `role="toolbar"`, plus `aria-orientation="vertical"` when vertical. Give it an `aria-label`.',
      'The items are one Tab stop with a roving `tabindex`, which falls to the first enabled item when the active one is disabled. The arrow keys skip disabled items.',
      'Each item is a `<button>` named by its `label`, plus its `badge` when set, such as “Inbox, 3”. The icon and the badge are `aria-hidden`.',
      'Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
  Sortable: {
    keyboard: [
      {
        keys: 'Enter / Space',
        action: 'Picks up the item from its focused handle, or drops the held item.',
      },
      {
        keys: 'ArrowUp / ArrowDown',
        action: 'Moves the held item one position, when `axis` is `y`.',
      },
      {
        keys: 'ArrowLeft / ArrowRight',
        action: 'Moves the held item one position, when `axis` is `x`.',
      },
      {
        keys: 'ArrowLeft / ArrowRight',
        action:
          'Moves the held item to the end of the previous or next list in a `group`, when `axis` is `y` (ArrowUp / ArrowDown when it is `x`).',
      },
      {
        keys: 'Escape',
        action:
          'Cancels the move and returns the item to where it started, during a keyboard move or a drag.',
      },
      { keys: 'Tab / Shift + Tab', action: 'Cancels a keyboard move as focus leaves the handle.' },
    ],
    notes: [
      'Each item\'s handle is a `<button>` named by `labelKey`, with `aria-roledescription="sortable item"`. Its `aria-describedby` points at hidden instructions for the keys.',
      'An always-mounted `role="status"` region with `aria-live="assertive"` announces each grab, move, drop and cancel with the position, such as “Position 2 of 5”.',
      'After a keyboard drop, focus stays on the moved item’s handle. Focus leaving the handle during a keyboard move cancels it. With `disabled`, the handles are disabled buttons.',
      'Right to left, ArrowLeft and ArrowRight swap.',
    ],
  },
}
