"use client";

import { useActionState, useState } from "react";
import { createContent } from "@/app/actions/content";
import { btn, card, Field, FormError, input, label } from "@/app/_ui/ui";
import { FORMATS, PLATFORMS, type Format } from "@/lib/content/types";
import { fill } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { Segmented } from "@/app/_ui/segmented";

export function NewContentForm({ businesses, businessId, date }: { businesses: { id: string; name: string }[]; businessId: string; date: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(createContent, undefined);
  const [format, setFormat] = useState<Format>("reel");
  const [day, setDay] = useState(date);
  return (
    <form action={action} className={`${card} grid max-w-2xl gap-5 p-5 sm:p-8`}>
      <Field label={t.common.business} htmlFor="business_id">
        <select id="business_id" name="business_id" defaultValue={businessId} required className={input}>
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
      <Field label={t.newContent.name} htmlFor="title">
        <input id="title" name="title" required maxLength={300} placeholder={t.newContent.namePlaceholder} className={input} />
      </Field>
      <div className="grid gap-1.5">
        <span className={label}>{t.newContent.format}</span>
        <Segmented name="format" options={FORMATS.map((f) => ({ value: f, label: t.formats[f] }))} value={format} onChange={(v) => setFormat(v as Format)} />
      </div>
      <fieldset className="grid gap-1.5">
        <legend className={`${label} mb-1.5`}>{t.newContent.platforms}</legend>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <label key={p} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line-bright bg-raised px-3 text-[13px] font-semibold has-[:checked]:border-fg has-[:checked]:bg-fg has-[:checked]:text-ground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
              <input type="checkbox" name="platforms" value={p} defaultChecked={p === "instagram"} className="sr-only" />
              {t.platforms[p]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
        <Field label={`${t.newContent.date} (${t.common.optional})`} htmlFor="publish_on">
          <input id="publish_on" name="publish_on" type="date" value={day} onChange={(e) => setDay(e.target.value)} className={input} />
        </Field>
        <Field label={t.newContent.time} htmlFor="publish_time">
          <input id="publish_time" name="publish_time" type="time" disabled={!day} className={input} />
        </Field>
      </div>
      <label className="flex items-start gap-3 rounded-lg bg-sunk p-3 text-sm">
        <input type="checkbox" name="template" defaultChecked className="mt-0.5 size-4 accent-[var(--color-accent-ink)]" />
        <span>
          <span className="font-semibold">{fill(t.newContent.useTemplate, { format: t.formats[format].toLowerCase() })}</span>
          <span className="mt-0.5 block text-[13px] text-fg-muted">{t.templates[format].filter(([k]) => k === "h").map(([, text]) => text).join(" · ")}</span>
        </span>
      </label>
      <FormError message={state?.error} />
      <button className={`${btn.accent} justify-self-start`} disabled={pending}>
        {pending ? t.common.creating : t.newContent.submit}
      </button>
    </form>
  );
}
