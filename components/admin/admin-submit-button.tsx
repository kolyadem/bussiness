"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function AdminSubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & {
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? pendingLabel ?? children : children}
    </Button>
  );
}
