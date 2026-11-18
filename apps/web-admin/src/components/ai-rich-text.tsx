"use client";

import { Fragment, type ReactNode } from "react";

/** Lightweight markdown-ish renderer for AI coach replies (bold, lists, breaks). */
export function AiRichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  return (
    <div className={`space-y-1.5 text-[13.5px] leading-relaxed ${className}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;

        const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2 pl-0.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <p className="min-w-0 flex-1">{renderInline(bullet[1])}</p>
            </div>
          );
        }

        const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
        if (numbered) {
          return (
            <div key={i} className="flex gap-2 pl-0.5">
              <span className="w-4 shrink-0 text-right font-semibold text-slate-500">
                {numbered[1]}.
              </span>
              <p className="min-w-0 flex-1">{renderInline(numbered[2])}</p>
            </div>
          );
        }

        const heading = trimmed.match(/^#{1,3}\s+(.*)$/);
        if (heading) {
          return (
            <p key={i} className="pt-0.5 font-semibold text-slate-900">
              {renderInline(heading[1])}
            </p>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(input: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(input)) !== null) {
    if (m.index > last) {
      nodes.push(
        <Fragment key={`t-${key++}`}>{input.slice(last, m.index)}</Fragment>
      );
    }
    const token = m[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={`b-${key++}`} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`c-${key++}`}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    last = m.index + token.length;
  }

  if (last < input.length) {
    nodes.push(<Fragment key={`t-${key++}`}>{input.slice(last)}</Fragment>);
  }

  return nodes.length ? nodes : [input];
}

export function plainAiText(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*•]\s+/gm, "• ")
    .trim();
}
