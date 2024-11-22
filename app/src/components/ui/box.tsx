import { cn } from "../../lib/utils";
import React from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {}

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ className, ...props }, ref) => (
    <div className={cn(className)} ref={ref} {...props} />
  ),
);

Box.displayName = "Box";

export { Box };