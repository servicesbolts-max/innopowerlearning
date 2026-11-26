"use client";

import { Printer } from "lucide-react";
import { Button, Icon } from "@/design-system";

/** Prints the certificate (the browser's print dialog can also save it as a PDF). */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="tinted" onPress={() => window.print()} className="self-start print:hidden">
      <Icon icon={Printer} size={20} />
      {label}
    </Button>
  );
}
