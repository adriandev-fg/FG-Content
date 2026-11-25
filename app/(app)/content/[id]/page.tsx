import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { fmtDay } from "@/lib/dates";
import { getI18n } from "@/lib/i18n";
import { BackLink, btn, FormatTag, Platforms } from "@/app/_ui/ui";
import { Icon } from "@/app/_ui/icons";
import { ContentEditor } from "./editor";
import { ContentReview } from "./review";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const viewer = await requireViewer();
  const found = await getContent(viewer, (await params).id);
  return { title: found?.item.title ?? "Content" };
}

/** One piece. The team edits it (or previews the client's view with ?view=client); a client reviews it. */
export default async function ContentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const viewer = await requireViewer();
  const { t, locale } = await getI18n();
  const found = await getContent(viewer, (await params).id);
  if (!found) notFound();
  const { item, comments, business } = found;
  const isAdmin = viewer.role === "admin";
  const preview = isAdmin && (await searchParams).view === "client";

  const meta = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
      <FormatTag format={item.format} t={t} />
      <Platforms platforms={item.platforms} t={t} />
      <span className="tabular">{item.publish_on ? `${fmtDay(item.publish_on, locale, { weekday: "short", day: "numeric", month: "short" })}${item.publish_time ? `, ${item.publish_time}` : ""}` : t.common.noDate}</span>
    </span>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BackLink href={isAdmin ? `/content?business=${business.id}` : "/content"}>{isAdmin ? business.name : t.nav.content}</BackLink>
        <div className="flex flex-wrap items-center gap-2">
          {business.assets_url && (
            <a href={business.assets_url} target="_blank" rel="noreferrer" className={btn.ghost}>
              <Icon name="external" size={16} /> {t.businesses.assets}
            </a>
          )}
          {isAdmin && item.status !== "draft" && (
            <Link href={preview ? `/content/${item.id}` : `/content/${item.id}?view=client`} className={btn.ghost}>
              {preview ? t.common.edit : t.review.clientView}
            </Link>
          )}
        </div>
      </div>
      {isAdmin && !preview ? (
        <ContentEditor item={item} comments={comments} businessName={business.name} />
      ) : (
        <ContentReview item={item} comments={comments} preview={preview} meta={meta} />
      )}
    </>
  );
}
