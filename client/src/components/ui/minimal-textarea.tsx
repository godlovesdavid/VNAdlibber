import * as React from "react";
import { cn } from "@/lib/utils";

export interface MinimalTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const MinimalTextarea = React.forwardRef<HTMLTextAreaElement, MinimalTextareaProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && (
          <label className="absolute left-2 top-1 text-xs font-medium text-gray-800 z-10">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-24 w-full rounded-md border border-gray-200 bg-white px-3 py-4 pt-6 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
MinimalTextarea.displayName = "MinimalTextarea";

export { MinimalTextarea };