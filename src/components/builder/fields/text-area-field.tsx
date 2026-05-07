"use client";

import { forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";

type Props = React.ComponentProps<typeof Textarea>;

export const TextAreaField = forwardRef<HTMLTextAreaElement, Props>(
  function TextAreaField(props, ref) {
    return <Textarea ref={ref} {...props} />;
  },
);
