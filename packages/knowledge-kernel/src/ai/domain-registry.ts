export const AI_RUNTIME_DOMAINS = [
  "heritage",
  "destination",
  "mega-events",
  "exhibition",
  "culture-programs",
  "urban-experience",
  "core",
] as const;

export type AiRuntimeDomain = typeof AI_RUNTIME_DOMAINS[number];

export const AI_RUNTIME_DOMAIN_DESCRIPTIONS: Record<AiRuntimeDomain, string> = {
  heritage: "التراث، الأصالة، السلامة، والتفسير",
  destination: "الوجهة، الشركاء، البرمجة، والموسمية",
  "mega-events": "الجاهزية، الحشود، والعمليات",
  exhibition: "المنطق القيّمي، الأصول، وتجربة المعرض",
  "culture-programs": "البرامج الثقافية، الأثر، والشراكات",
  "urban-experience": "الحركة، التفعيل المكاني، ووضوح المسارات",
  core: "الطبقة العامة المشتركة",
};
