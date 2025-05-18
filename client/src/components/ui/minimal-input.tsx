import * as React from "react";
import { cn } from "@/lib/utils";

export interface MinimalInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const MinimalInput = React.forwardRef<HTMLInputElement, MinimalInputProps>(
  ({ className, label, type, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && (
          <label className="absolute left-2 top-1 text-xs font-medium text-gray-500">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-14 w-full rounded-md border border-gray-200 bg-white px-3 py-4 pt-6 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
MinimalInput.displayName = "MinimalInput";

export { MinimalInput };