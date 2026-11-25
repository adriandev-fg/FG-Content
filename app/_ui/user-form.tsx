"use client";

import { useActionState, useRef, useState } from "react";
import { createUser, type FormState } from "@/app/actions/admin";
import { useI18n } from "@/lib/i18n/client";
import { btn, Field, FormError, input } from "./ui";

/** A readable random password: no look-alike characters. */
function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** Adds a user. With `businessId` it is a client login for that business (the business page). */
export function UserForm({ businesses, businessId }: { businesses: { id: string; name: string }[]; businessId?: string }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const res = await createUser(prev, form);
    if (res?.ok) formRef.current?.reset();
    return res;
  }, undefined);
  const [role, setRole] = useState<"client" | "admin">("client");
  const [password, setPassword] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.users.email} htmlFor="u-email">
          <input id="u-email" name="email" type="email" required autoComplete="off" className={input} />
        </Field>
        <Field label={`${t.users.name} (${t.common.optional})`} htmlFor="u-name">
          <input id="u-name" name="name" maxLength={200} autoComplete="off" className={input} />
        </Field>
      </div>
      <Field label={t.users.password} hint={t.users.passwordHint} htmlFor="u-password">
        <div className="flex gap-2">
          <input id="u-password" name="password" type="text" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} tabular font-mono`} />
          <button type="button" className={btn.outline} onClick={() => setPassword(generatePassword())}>
            {t.users.generate}
          </button>
        </div>
      </Field>
      {businessId ? (
        <>
          <input type="hidden" name="role" value="client" />
          <input type="hidden" name="business_id" value={businessId} />
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.users.role} htmlFor="u-role">
            <select id="u-role" name="role" value={role} onChange={(e) => setRole(e.target.value as "client" | "admin")} className={input}>
              <option value="client">{t.users.roleClient}</option>
              <option value="admin">{t.users.roleAdmin}</option>
            </select>
          </Field>
          {role === "client" && (
            <Field label={t.users.business} htmlFor="u-business">
              <select id="u-business" name="business_id" required defaultValue="" className={input}>
                <option value="" disabled>
                  -
                </option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      )}
      <Field label={t.account.language} htmlFor="u-lang">
        <select id="u-lang" name="lang" defaultValue={locale} className={`${input} sm:max-w-56`}>
          <option value="en">{t.lang.en}</option>
          <option value="pl">{t.lang.pl}</option>
        </select>
      </Field>
      <FormError message={state?.error} />
      {state?.ok && (
        <p role="status" className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">
          {state.ok}
        </p>
      )}
      <button className={`${btn.primary} justify-self-start`} disabled={pending}>
        {pending ? t.common.creating : t.users.new}
      </button>
    </form>
  );
}
