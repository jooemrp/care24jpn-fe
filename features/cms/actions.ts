"use server";

import { bff } from "@/lib/bff";
import type { ApiResult } from "@/lib/api";
import type { Bilingual } from "@/constants/copy";
import type {
  PublicPageData,
  PublicSection,
  PublicService,
  BilingualPageData,
  BilingualSection,
  BilingualSectionItem,
  BilingualCTAButton,
  BilingualPricingItem,
  BilingualService,
  CMSApiResponse,
} from "./types";

export type {
  PublicSeo,
  PublicMedia,
  PublicSectionItem,
  PublicCTAButton,
  PublicSection,
  PublicPricingItem,
  PublicService,
  PublicPageData,
  BilingualSectionItem,
  BilingualCTAButton,
  BilingualSection,
  BilingualPricingItem,
  BilingualService,
  BilingualPageData,
  CMSApiResponse,
} from "./types";

function mergeBilingual<T extends Record<string, string>>(
  ja: T | undefined | null,
  en: T | undefined | null
): Record<string, Bilingual> {
  const keys = new Set([
    ...Object.keys(ja || {}),
    ...Object.keys(en || {}),
  ]);
  const result: Record<string, Bilingual> = {};
  for (const key of keys) {
    result[key] = {
      ja: ja?.[key] || en?.[key] || "",
      en: en?.[key] || ja?.[key] || "",
    };
  }
  return result;
}

function mergeBilingualString(
  jaVal: string | undefined,
  enVal: string | undefined
): Bilingual {
  const ja = jaVal || enVal || "";
  const en = enVal || jaVal || "";
  return { ja, en };
}

function mergeSections(
  jaSections: PublicSection[],
  enSections: PublicSection[]
): BilingualSection[] {
  const jaMap = new Map(jaSections.map((s) => [s.section_key, s]));
  const enMap = new Map(enSections.map((s) => [s.section_key, s]));
  const keys = new Set([...jaMap.keys(), ...enMap.keys()]);
  const result: BilingualSection[] = [];

  for (const key of keys) {
    const ja = jaMap.get(key);
    const en = enMap.get(key);
    const maxItems = Math.max(
      ja?.items?.length || 0,
      en?.items?.length || 0
    );
    const maxCtas = Math.max(
      ja?.cta_buttons?.length || 0,
      en?.cta_buttons?.length || 0
    );

    const items: BilingualSectionItem[] = [];
    for (let i = 0; i < maxItems; i++) {
      const jaItem = ja?.items?.[i];
      const enItem = en?.items?.[i];
      items.push({
        id: jaItem?.id || enItem?.id || "",
        sort_order: jaItem?.sort_order ?? enItem?.sort_order ?? 0,
        icon_key: jaItem?.icon_key || enItem?.icon_key,
        service_id: jaItem?.service_id || enItem?.service_id,
        media: jaItem?.media || enItem?.media,
        fields: mergeBilingual(jaItem?.fields, enItem?.fields),
      });
    }

    const cta_buttons: BilingualCTAButton[] = [];
    for (let i = 0; i < maxCtas; i++) {
      const jaCta = ja?.cta_buttons?.[i];
      const enCta = en?.cta_buttons?.[i];
      cta_buttons.push({
        id: jaCta?.id || enCta?.id || "",
        button_order: jaCta?.button_order ?? enCta?.button_order ?? 0,
        url: jaCta?.url || enCta?.url || "",
        label: mergeBilingualString(jaCta?.label, enCta?.label),
      });
    }

    result.push({
      section_key: key,
      section_type: ja?.section_type || en?.section_type || "text",
      sort_order: ja?.sort_order ?? en?.sort_order ?? 0,
      fields: mergeBilingual(ja?.fields, en?.fields),
      items,
      cta_buttons,
    });
  }

  return result.sort((a, b) => a.sort_order - b.sort_order);
}

function mergeServices(
  jaServices: PublicService[] | undefined,
  enServices: PublicService[] | undefined
): BilingualService[] | undefined {
  if (!jaServices?.length && !enServices?.length) return undefined;

  const jaMap = new Map(jaServices?.map((s) => [s.slug, s]) || []);
  const enMap = new Map(enServices?.map((s) => [s.slug, s]) || []);
  const keys = new Set([...jaMap.keys(), ...enMap.keys()]);

  return Array.from(keys).map((slug) => {
    const ja = jaMap.get(slug);
    const en = enMap.get(slug);
    const maxItems = Math.max(
      ja?.items?.length || 0,
      en?.items?.length || 0
    );

    const items: BilingualPricingItem[] = [];
    for (let i = 0; i < maxItems; i++) {
      const jaItem = ja?.items?.[i];
      const enItem = en?.items?.[i];
      items.push({
        id: jaItem?.id || enItem?.id || "",
        item_key: jaItem?.item_key || enItem?.item_key || "",
        price: jaItem?.price ?? enItem?.price,
        unit: jaItem?.unit || enItem?.unit,
        label: mergeBilingualString(jaItem?.label, enItem?.label),
      });
    }

    return {
      id: ja?.id || en?.id || "",
      slug,
      name: mergeBilingualString(ja?.name, en?.name),
      description: mergeBilingualString(ja?.description, en?.description),
      items,
    };
  });
}

export async function getBilingualPage(
  slug: string
): Promise<ApiResult<BilingualPageData>> {
  const [jaResult, enResult] = await Promise.all([
    bff.get<PublicPageData>(`/${slug}`, "ja", {
      feature: "cms",
      action: "page-read",
    }),
    bff.get<PublicPageData>(`/${slug}`, "en", {
      feature: "cms",
      action: "page-read",
    }),
  ]);

  if (!jaResult.success && !enResult.success) {
    return {
      success: false,
      error: jaResult.error || enResult.error || {
        code: "NETWORK_ERROR",
        message: "Failed to fetch page data",
      },
    };
  }

  const jaData = jaResult.success ? jaResult.data : undefined;
  const enData = enResult.success ? enResult.data : undefined;
  const primary = jaData || enData!;

  return {
    success: true,
    data: {
      slug: primary.slug,
      title: primary.title,
      seo: primary.seo,
      sections: mergeSections(
        jaData?.sections || [],
        enData?.sections || []
      ),
      services: mergeServices(jaData?.services, enData?.services),
    },
  };
}
