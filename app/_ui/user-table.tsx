"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeUser, resetPassword } from "@/app/actions/admin";
import { fmtDateTime } from "@/lib/dates";
import { fill } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { card } from "./ui";

export type UserRow = { user_id: string; email: string; name: string; role: "admin" | "client"; business_name: string | null; created_at: string };

export function UserTable({ users, me }: { users: UserRow[]; me: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, start] = useTransition();
  if (users.length === 0) return <p className={`${card} px-5 py-8 text-center text-sm text-fg-muted`}>{t.users.empty}</p>;
  const who = (u: UserRow) => u.name || u.email;
  return (
    <div className="grid gap-2">
      {message && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${message.bad ? "bg-bad-soft text-bad" : "bg-good-soft text-good"}`}>
          {message.text}
        </p>
      )}
      <ul className={`${card} divide-y divide-line ${pending ? "opacity-70" : ""}`}>
        {users.map((u) => (
          <li key={u.user_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
              <span className="truncate font-semibold">
                {who(u)} {u.user_id === me && <span className="font-normal text-fg-dim">({t.users.you})</span>}
              </span>
              {u.name && <span className="truncate text-[13px] text-fg-dim">{u.email}</span>}
            </div>
            <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${u.role === "admin" ? "bg-fg text-ground" : "bg-sunk text-fg-muted"}`}>
              {u.role === "admin" ? t.users.admin : (u.business_name ?? t.users.client)}
            </span>
            <span className="tabular hidden text-[13px] text-fg-dim md:inline">{fmtDateTime(u.created_at, locale)}</span>
            <span className="flex gap-1">
              <button
                type="button"
                className="h-9 rounded-lg px-2.5 text-[13px] font-semibold text-fg-muted hover:bg-sunk hover:text-fg"
                onClick={() => {
                  const pw = window.prompt(fill(t.users.resetPrompt, { name: who(u) }));
                  if (!pw) return;
                  start(async () => {
                    const res = await resetPassword(u.user_id, pw);
                    setMessage(res.error ? { text: res.error, bad: true } : { text: res.ok ?? "" });
                  });
                }}
              >
                {t.users.resetPassword}
              </button>
              {u.user_id !== me && (
                <button
                  type="button"
                  className="h-9 rounded-lg px-2.5 text-[13px] font-semibold text-bad hover:bg-bad-soft"
                  onClick={() => {
                    if (!window.confirm(fill(t.users.removeConfirm, { name: who(u) }))) return;
                    start(async () => {
                      const res = await removeUser(u.user_id);
                      if (res.error) setMessage({ text: res.error, bad: true });
                      else router.refresh();
                    });
                  }}
                >
                  {t.users.remove}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
