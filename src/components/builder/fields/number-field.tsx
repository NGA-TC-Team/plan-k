"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

type Props = React.ComponentProps<typeof Input>;

export const NumberField = forwardRef<HTMLInputElement, Props>(
  function NumberField(props, ref) {
    return <Input ref={ref} type="number" {...props} />;
  },
);
