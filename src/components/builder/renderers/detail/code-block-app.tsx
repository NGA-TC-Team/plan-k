"use client";

import type { BlockRenderer } from "../types";

// App-context code-block detail.
// Renders code with dark/light theme, optional line numbers, language label.
// No syntax highlighting library — plain monospace single-color, per spec.

function stringVal(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function boolVal(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function themeVal(v: unknown): "light" | "dark" {
  return v === "light" || v === "dark" ? v : "dark";
}

export const CodeBlockAppDetail: BlockRenderer = ({ vm }) => {
  const language = stringVal(vm.displayValue.language) || "text";
  const code = stringVal(vm.displayValue.code);
  const showLineNumbers = boolVal(vm.displayValue.showLineNumbers, true);
  const theme = themeVal(vm.displayValue.theme);

  const isDark = theme === "dark";

  // Split code lines. Empty code → single placeholder line.
  const lines =
    code.length > 0 ? code.split("\n") : ["// empty"];

  return (
    <div
      className={`overflow-hidden rounded-lg border font-mono text-body-sm ${
        isDark
          ? "border-neutral-700 bg-neutral-900 text-neutral-100"
          : "border-neutral-200 bg-neutral-50 text-neutral-900"
      }`}
    >
      {/* Header: language label */}
      <div
        className={`flex items-center justify-end border-b px-3 py-1.5 ${
          isDark
            ? "border-neutral-700 bg-neutral-800 text-neutral-400"
            : "border-neutral-200 bg-neutral-100 text-neutral-500"
        }`}
      >
        <span className="text-caption font-medium uppercase tracking-eyebrow">
          {language}
        </span>
      </div>

      {/* Code body: optional line numbers + code */}
      <div className="overflow-x-auto">
        {/* Very long code (>200 lines) scrolls rather than being clipped. */}
        <table
          className="w-full border-collapse"
          aria-label={`${language} code`}
        >
          <tbody>
            {lines.map((line, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: line index is stable for static code display
              <tr key={idx}>
                {showLineNumbers ? (
                  <td
                    className={`select-none whitespace-nowrap px-3 py-0.5 text-right text-caption tabular-nums ${
                      isDark ? "text-neutral-600" : "text-neutral-400"
                    }`}
                    aria-hidden
                  >
                    {idx + 1}
                  </td>
                ) : null}
                <td className="whitespace-pre px-3 py-0.5 leading-relaxed">
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
