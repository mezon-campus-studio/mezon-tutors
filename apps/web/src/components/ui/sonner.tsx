"use client";

import type * as React from "react";
import { Toaster as SonnerToaster, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className:
          "border border-border bg-background text-foreground shadow-lg",
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
