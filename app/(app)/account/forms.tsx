"use client";

import { useActionState } from "react";
import { changePassword, updateName, type FormState } from "@/app/actions/admin";
import { btn, Field, FormError, input } from "@/app/_ui/ui";
import { useI18n } from "@/lib/i18n/client";

export function NameForm({ name }: { name: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(updateName, undefined);
  return (
    <form action={action} className="grid gap-2">
      <Field label={t.account.name} hint={t.account.nameHint} htmlFor="a-name">
        <div className="flex gap-2">
          <input id="a-name" name="name" defaultValue={name} maxLength={200} autoComplete="name" className={input} />
          <button className={btn.outline} disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </button>
        </div>
      </Field>
      <FormError message={state?.error} />
      {state?.ok && <p className="text-sm text-good">{state.ok}</p>}
    </form>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, undefined);
  return (
    <form action={action} className="grid gap-4 sm:max-w-sm">
      <Field label={t.account.password} htmlFor="a-pw">
        <input id="a-pw" name="password" type="password" minLength={8} required autoComplete="new-password" className={input} />
      </Field>
      <Field label={t.account.passwordRepeat} htmlFor="a-pw2">
        <input id="a-pw2" name="repeat" type="password" minLength={8} required autoComplete="new-password" className={input} />
      </Field>
      <FormError message={state?.error} />
      {state?.ok && <p className="text-sm text-good">{state.ok}</p>}
      <button className={`${btn.primary} justify-self-start`} disabled={pending}>
        {pending ? t.common.saving : t.account.changePassword}
      </button>
    </form>
  );
}
