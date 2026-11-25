"use client";

import { useActionState } from "react";
import { createBusiness, updateBusiness, type FormState } from "@/app/actions/admin";
import { useI18n } from "@/lib/i18n/client";
import { btn, Field, FormError, input, textarea } from "./ui";

/** Create (no `business`) or edit a business. */
export function BusinessForm({ business }: { business?: { id: string; name: string; assets_url: string; notes: string } }) {
  const { t } = useI18n();
  const act = business ? updateBusiness.bind(null, business.id) : createBusiness;
  const [state, action, pending] = useActionState<FormState, FormData>(act, undefined);
  return (
    <form action={action} className="grid gap-4">
      <Field label={t.businesses.name} htmlFor="b-name">
        <input id="b-name" name="name" required maxLength={200} defaultValue={business?.name} className={input} />
      </Field>
      <Field label={`${t.businesses.assetsUrl} (${t.common.optional})`} hint={t.businesses.assetsUrlHint} htmlFor="b-assets">
        <input id="b-assets" name="assets_url" type="url" inputMode="url" placeholder="https://drive.google.com/..." defaultValue={business?.assets_url} className={input} />
      </Field>
      <Field label={`${t.businesses.notes} (${t.common.optional})`} hint={t.businesses.notesHint} htmlFor="b-notes">
        <textarea id="b-notes" name="notes" maxLength={4000} defaultValue={business?.notes} className={textarea} />
      </Field>
      <FormError message={state?.error} />
      {state?.ok && <p className="text-sm text-good">{state.ok}</p>}
      <button className={`${btn.primary} justify-self-start`} disabled={pending}>
        {pending ? (business ? t.common.saving : t.common.creating) : business ? t.common.save : t.businesses.new}
      </button>
    </form>
  );
}
