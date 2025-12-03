import React from "react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", className, children, ...props }, ref) => {
  // Allow children to be used as text if text prop is not provided
  const content = text === "Button" && children ? children : text;

  return (
    <button
      ref={ref}
      className={cn(
        "group relative w-auto min-w-[140px] cursor-pointer overflow-hidden rounded-full border bg-background p-2 px-6 text-center font-semibold",
        className
      )}
      {...props}
    >
      <span className="inline-block transition-all duration-300 group-hover:opacity-0">
        {content}
      </span>
      <div className="absolute top-0 left-0 z-10 flex h-full w-full items-center justify-center text-primary-foreground opacity-0 transition-all duration-300 group-hover:opacity-100">
        <span>{content}</span>
      </div>
      {!props.disabled && (
        <div className="absolute left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-primary opacity-0 transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-hover:bg-primary group-hover:opacity-100"></div>
      )}
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
