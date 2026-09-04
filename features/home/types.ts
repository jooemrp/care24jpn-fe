import type { Bilingual, home as homeCopy } from "@/constants/copy";

type Home = typeof homeCopy;
type Card = Home["careCourse"]["cards"][number];
type NursingFeature = Home["nursingCourse"]["panel"]["items"][number];

/** Fee cell shared by care and nursing course blocks (note is optional). */
export type HomeFee = {
  label: Bilingual;
  value: Bilingual;
  note?: Bilingual;
};

export type HomeContent = Omit<
  Home,
  | "hero"
  | "careCourse"
  | "nursingCourse"
  | "contact"
  | "flow"
  | "about"
  | "problems"
  | "apply"
  | "pricingSummary"
  | "pricingDetailsLink"
> & {
  hero: Omit<Home["hero"], "body" | "ctaSecondary"> & {
    body?: Bilingual;
    ctaSecondary?: Bilingual;
    image: string;
  };
  careCourse: Omit<Home["careCourse"], "cards" | "fees"> & {
    fees: HomeFee[];
    cards: (Card & { image: string })[];
  };
  nursingCourse: Omit<Home["nursingCourse"], "panel" | "fees"> & {
    fees: HomeFee[];
    panel: {
      heading?: Bilingual;
      items: NursingFeature[];
    };
  };
  contact: Home["contact"] & { micsLogo: string; isoLogo: string };
  about: Omit<Home["about"], "cards"> & {
    illustration: string;
    cards: (Home["about"]["cards"][number] & { image: string })[];
  };
  problems: Omit<Home["problems"], "items"> & {
    items: { title: Bilingual; image: string }[];
  };
  apply: {
    user: Home["apply"]["user"];
    staff: Home["apply"]["staff"];
  };
  flow: Omit<Home["flow"], "steps"> & {
    steps: (Omit<Home["flow"]["steps"][number], "icon"> & { image: string })[];
  };
  pricingSummary: {
    heading: Bilingual;
    care: Home["pricingSummary"]["care"];
    nursing: Home["pricingSummary"]["nursing"];
    extensionNote: Bilingual;
    payment: {
      heading: Bilingual;
      body: Bilingual;
      settleNote?: Bilingual;
      logos: { mark: string; src: string; alt: Bilingual }[];
    };
  };
  pricingDetailsLink: Bilingual;
  pricingDetailsHref: string;
};

export type HomeNursingFee = HomeFee;
export type HomeCard = Card & { image: string };
export type HomeNursingFeature = NursingFeature;
