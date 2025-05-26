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
        <div className="pt-4 border rounded-md focus-within:ring-1 focus-within:ring-gray-950">
          <textarea
            className="w-full resize-none p-3 text-sm focus:outline-none"
            {...props}
          />
        </div>
      </div>
    );
  }
);
MinimalTextarea.displayName = "MinimalTextarea";

export { MinimalTextarea };