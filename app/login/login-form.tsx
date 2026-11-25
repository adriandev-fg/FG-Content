"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/session";
import { btn, Field, FormError, input } from "@/app/_ui/ui";
import { useI18n } from "@/lib/i18n/client";

export function LoginForm({ next }: { next: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label={t.login.email} htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </Field>
      <Field label={t.login.password} htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </Field>
      <FormError message={state?.error ? t.login[state.error] : null} />
      <button className={`${btn.primary} mt-2 w-full`} disabled={pending}>
        {pending ? t.login.submitting : t.login.submit}
      </button>
    </form>
  );
}
