"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { usePrintOptionsStore } from "@/services/stores/print-options.store";

export function PrintOptionsPopover() {
  const cover = usePrintOptionsStore((s) => s.cover);
  const toc = usePrintOptionsStore((s) => s.toc);
  const pageNumbers = usePrintOptionsStore((s) => s.pageNumbers);
  const footerText = usePrintOptionsStore((s) => s.footerText);

  const setCover = usePrintOptionsStore((s) => s.setCover);
  const setToc = usePrintOptionsStore((s) => s.setToc);
  const setPageNumbers = usePrintOptionsStore((s) => s.setPageNumbers);
  const setFooterText = usePrintOptionsStore((s) => s.setFooterText);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Print options"
            title="Print options"
          />
        }
      >
        <Settings className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[300px]">
        <p className="mb-3 text-sm font-medium">프린트 옵션</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="po-cover" className="cursor-pointer">
              표지
            </Label>
            <Switch id="po-cover" checked={cover} onCheckedChange={setCover} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="po-toc" className="cursor-pointer">
              목차
            </Label>
            <Switch id="po-toc" checked={toc} onCheckedChange={setToc} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="po-page-numbers" className="cursor-pointer">
              페이지 번호
            </Label>
            <Switch
              id="po-page-numbers"
              checked={pageNumbers}
              onCheckedChange={setPageNumbers}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="po-footer-text">푸터 텍스트</Label>
            <Input
              id="po-footer-text"
              type="text"
              placeholder="Optional footer label…"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
