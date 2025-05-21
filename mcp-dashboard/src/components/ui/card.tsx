import * as React from "react";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white shadow-md rounded-lg p-4 ${className}`} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-2 ${className}`} {...props} />;
}
