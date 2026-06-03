import type { Bilingual } from "@/constants/copy";

export interface PublicSeo {
  title?: string;
  description?: string;
  og_image_id?: string;
}

export interface PublicMedia {
  slot_key: string;
  file_path: string;
  alt_text?: string;
}

export interface PublicSectionItem {
  id: string;
  sort_order: number;
  icon_key?: string;
  service_id?: string;
  media?: PublicMedia;
  fields: Record<string, string>;
}

export interface PublicCTAButton {
  id: string;
  button_order: number;
  url: string;
  label: string;
}

export interface PublicSection {
  section_key: string;
  section_type: string;
  sort_order: number;
  fields: Record<string, string>;
  items: PublicSectionItem[];
  cta_buttons: PublicCTAButton[];
}

export interface PublicPricingItem {
  id: string;
  item_key: string;
  price?: number;
  unit?: string;
  label: string;
}

export interface PublicService {
  id: string;
  slug: string;
  name: string;
  description?: string;
  items: PublicPricingItem[];
}

export interface PublicPageData {
  slug: string;
  title: string;
  lang: string;
  seo?: PublicSeo;
  sections: PublicSection[];
  services?: PublicService[];
}

export interface BilingualSectionItem {
  id: string;
  sort_order: number;
  icon_key?: string;
  service_id?: string;
  media?: PublicMedia;
  fields: Record<string, Bilingual>;
}

export interface BilingualCTAButton {
  id: string;
  button_order: number;
  url: string;
  label: Bilingual;
}

export interface BilingualSection {
  section_key: string;
  section_type: string;
  sort_order: number;
  fields: Record<string, Bilingual>;
  items: BilingualSectionItem[];
  cta_buttons: BilingualCTAButton[];
}

export interface BilingualPricingItem {
  id: string;
  item_key: string;
  price?: number;
  unit?: string;
  label: Bilingual;
}

export interface BilingualService {
  id: string;
  slug: string;
  name: Bilingual;
  description: Bilingual;
  items: BilingualPricingItem[];
}

export interface BilingualPageData {
  slug: string;
  title: string;
  seo?: PublicSeo;
  sections: BilingualSection[];
  services?: BilingualService[];
}

export interface CMSApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  code?: string;
  traceId?: string;
}
