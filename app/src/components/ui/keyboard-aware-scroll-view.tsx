import { cssInterop } from "nativewind";
import {
  KeyboardAwareScrollView as KeyboardAwareScrollViewImpl,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

/**
 * Space kept between the focused field's caret and the keyboard. The scroll view keeps the caret, not
 * the field's bottom edge, above the keyboard: 48 clears a whole single-line input (same as Medelis).
 */
export const KEYBOARD_OFFSET = 48;

// Lets `className` / `contentContainerClassName` style it like a ScrollView.
cssInterop(KeyboardAwareScrollViewImpl, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

/**
 * The scroll view for anything that holds an input: it scrolls the focused field above the keyboard
 * on iOS and Android, also inside a Modal. With the root KeyboardProvider active Android never
 * resizes the window for the keyboard, so a plain ScrollView leaves fields under it. On web it is a
 * plain ScrollView (the browser handles the keyboard).
 */
export function KeyboardAwareScrollView({
  bottomOffset = KEYBOARD_OFFSET,
  keyboardShouldPersistTaps = "handled",
  ...props
}: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAwareScrollViewImpl
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    />
  );
}
