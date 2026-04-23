import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoAdjust?: boolean;
  maxAutoHeight?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  autoAdjust = true,
  maxAutoHeight,
  onInput,
  ...props
}, ref) => {
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      localRef.current = node;

      if (typeof ref === "function") {
        ref(node);
        return;
      }

      if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  const adjustHeight = React.useCallback(() => {
    if (!autoAdjust || !localRef.current) return;

    const textarea = localRef.current;
    textarea.style.height = "auto";

    const nextHeight = maxAutoHeight
      ? Math.min(textarea.scrollHeight, maxAutoHeight)
      : textarea.scrollHeight;

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = maxAutoHeight && textarea.scrollHeight > maxAutoHeight ? "auto" : "hidden";
  }, [autoAdjust, maxAutoHeight]);

  React.useLayoutEffect(() => {
    adjustHeight();
  }, [adjustHeight, props.value, props.defaultValue]);

  const handleInput = React.useCallback(
    (event: React.FormEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onInput?.(event);
    },
    [adjustHeight, onInput],
  );

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onInput={handleInput}
      ref={setRefs}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
