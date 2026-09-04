import type { Bilingual, home as homeCopy } from "@/constants/copy";

type Home = typeof homeCopy;
type Fee = Home["careCourse"]["fees"][number];
type Card = Home["careCourse"]["cards"][number];
type NursingFeature = Home["nursingCourse"]["panel"]["items"][number];

export type HomeContent = Omit<
  Home,
  | "hero"
  | "careCourse"
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
  careCourse: Omit<Home["careCourse"], "cards"> & {
    cards: (Card & { image: string })[];
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
    payment: {
      heading: Bilingual;
      body: Bilingual;
      settleNote: Bilingual;
      logos: { mark: string; src: string }[];
    };
  };
  pricingDetailsLink?: Bilingual;
};

export type HomeFee = Fee;
export type HomeCard = Card & { image: string };
export type HomeNursingFeature = NursingFeature;
