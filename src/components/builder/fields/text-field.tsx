"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

type Props = React.ComponentProps<typeof Input>;

export const TextField = forwardRef<HTMLInputElement, Props>(
  function TextField(props, ref) {
    return <Input ref={ref} type="text" {...props} />;
  },
);
