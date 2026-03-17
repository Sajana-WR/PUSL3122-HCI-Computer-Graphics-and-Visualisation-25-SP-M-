import type { FurnitureCategory } from "../firebase/firestore";

const svgCache = new Map<string, string>();

function encodeSvg(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function baseSvg(inner: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect x="0" y="0" width="240" height="160" rx="28" fill="#ffffff"/><rect x="10" y="10" width="220" height="140" rx="24" fill="#f8fafc" stroke="#e2e8f0"/>${inner}</svg>`;
}

export function furnitureThumbnailDataUri(params: {
  category: FurnitureCategory;
  color: string;
}) {
  const key = `${params.category}|${params.color}`;
  const cached = svgCache.get(key);
  if (cached) return cached;

  const c = params.color;
  const stroke = "#0f172a";
  const muted = "#94a3b8";

  const svgByCategory: Record<FurnitureCategory, string> = {
    sofa: baseSvg(
      `<rect x="34" y="60" width="172" height="66" rx="22" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="44" y="42" width="152" height="36" rx="16" fill="#ffffff" opacity="0.35"/><rect x="34" y="84" width="22" height="42" rx="10" fill="#ffffff" opacity="0.25"/><rect x="184" y="84" width="22" height="42" rx="10" fill="#ffffff" opacity="0.25"/>`,
    ),
    armchair: baseSvg(
      `<rect x="70" y="46" width="100" height="92" rx="28" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="86" y="60" width="68" height="38" rx="16" fill="#ffffff" opacity="0.3"/><rect x="60" y="76" width="22" height="52" rx="10" fill="#ffffff" opacity="0.25"/><rect x="158" y="76" width="22" height="52" rx="10" fill="#ffffff" opacity="0.25"/>`,
    ),
    coffee_table: baseSvg(
      `<rect x="56" y="58" width="128" height="54" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="66" y="68" width="108" height="34" rx="14" fill="#ffffff" opacity="0.18"/><circle cx="76" cy="120" r="6" fill="${muted}"/><circle cx="164" cy="120" r="6" fill="${muted}"/>`,
    ),
    tv_stand: baseSvg(
      `<rect x="48" y="66" width="144" height="52" rx="16" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="62" y="78" width="44" height="28" rx="10" fill="#ffffff" opacity="0.22"/><rect x="114" y="78" width="64" height="28" rx="10" fill="#ffffff" opacity="0.18"/>`,
    ),
    bookshelf: baseSvg(
      `<rect x="70" y="28" width="100" height="116" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="84" y="46" width="72" height="12" rx="6" fill="#ffffff" opacity="0.25"/><rect x="84" y="74" width="72" height="12" rx="6" fill="#ffffff" opacity="0.25"/><rect x="84" y="102" width="72" height="12" rx="6" fill="#ffffff" opacity="0.25"/>`,
    ),
    dining_table: baseSvg(
      `<rect x="44" y="56" width="152" height="58" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="62" y="70" width="116" height="30" rx="14" fill="#ffffff" opacity="0.16"/><circle cx="60" cy="124" r="6" fill="${muted}"/><circle cx="180" cy="124" r="6" fill="${muted}"/>`,
    ),
    dining_chair: baseSvg(
      `<rect x="86" y="42" width="68" height="88" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="96" y="52" width="48" height="24" rx="10" fill="#ffffff" opacity="0.25"/><rect x="98" y="112" width="44" height="12" rx="6" fill="#ffffff" opacity="0.18"/>`,
    ),
    sideboard: baseSvg(
      `<rect x="52" y="58" width="136" height="62" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="66" y="74" width="44" height="32" rx="10" fill="#ffffff" opacity="0.22"/><rect x="120" y="74" width="54" height="32" rx="10" fill="#ffffff" opacity="0.18"/>`,
    ),
    cabinet: baseSvg(
      `<rect x="78" y="26" width="84" height="118" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="88" y="44" width="64" height="42" rx="12" fill="#ffffff" opacity="0.2"/><rect x="88" y="94" width="64" height="42" rx="12" fill="#ffffff" opacity="0.16"/>`,
    ),
    kitchen_island: baseSvg(
      `<rect x="46" y="58" width="148" height="56" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="58" y="70" width="124" height="16" rx="8" fill="#ffffff" opacity="0.22"/><circle cx="70" cy="124" r="6" fill="${muted}"/><circle cx="170" cy="124" r="6" fill="${muted}"/>`,
    ),
    stool: baseSvg(
      `<circle cx="120" cy="84" r="34" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="104" y="110" width="32" height="18" rx="9" fill="#ffffff" opacity="0.2"/>`,
    ),
    refrigerator: baseSvg(
      `<rect x="86" y="22" width="68" height="122" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="94" y="34" width="52" height="48" rx="12" fill="#ffffff" opacity="0.18"/><rect x="94" y="90" width="52" height="44" rx="12" fill="#ffffff" opacity="0.14"/>`,
    ),
    shelf: baseSvg(
      `<rect x="46" y="66" width="148" height="28" rx="14" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="62" y="76" width="116" height="8" rx="4" fill="#ffffff" opacity="0.2"/>`,
    ),
    bed: baseSvg(
      `<rect x="54" y="40" width="132" height="96" rx="22" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="66" y="48" width="108" height="32" rx="16" fill="#ffffff" opacity="0.22"/><rect x="66" y="86" width="108" height="40" rx="18" fill="#ffffff" opacity="0.14"/>`,
    ),
    bedside_table: baseSvg(
      `<rect x="86" y="54" width="68" height="72" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="96" y="66" width="48" height="20" rx="10" fill="#ffffff" opacity="0.22"/><rect x="96" y="92" width="48" height="20" rx="10" fill="#ffffff" opacity="0.18"/>`,
    ),
    wardrobe: baseSvg(
      `<rect x="70" y="20" width="100" height="124" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="82" y="34" width="76" height="98" rx="14" fill="#ffffff" opacity="0.14"/><circle cx="116" cy="84" r="4" fill="${stroke}"/><circle cx="124" cy="84" r="4" fill="${stroke}"/>`,
    ),
    dresser: baseSvg(
      `<rect x="64" y="44" width="112" height="92" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="78" y="60" width="84" height="18" rx="9" fill="#ffffff" opacity="0.2"/><rect x="78" y="84" width="84" height="18" rx="9" fill="#ffffff" opacity="0.18"/><rect x="78" y="108" width="84" height="18" rx="9" fill="#ffffff" opacity="0.16"/>`,
    ),
    office_desk: baseSvg(
      `<rect x="44" y="62" width="152" height="44" rx="16" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="54" y="74" width="132" height="14" rx="7" fill="#ffffff" opacity="0.18"/><rect x="58" y="108" width="20" height="26" rx="10" fill="${muted}"/><rect x="162" y="108" width="20" height="26" rx="10" fill="${muted}"/>`,
    ),
    office_chair: baseSvg(
      `<rect x="86" y="40" width="68" height="78" rx="20" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="98" y="54" width="44" height="26" rx="12" fill="#ffffff" opacity="0.22"/><circle cx="120" cy="128" r="14" fill="${muted}"/><rect x="118" y="108" width="4" height="18" rx="2" fill="${stroke}"/>`,
    ),
    drawer_unit: baseSvg(
      `<rect x="86" y="44" width="68" height="92" rx="18" fill="${c}" stroke="${stroke}" stroke-width="2"/><rect x="96" y="58" width="48" height="18" rx="9" fill="#ffffff" opacity="0.2"/><rect x="96" y="82" width="48" height="18" rx="9" fill="#ffffff" opacity="0.18"/><rect x="96" y="106" width="48" height="18" rx="9" fill="#ffffff" opacity="0.16"/>`,
    ),
  };

  const uri = encodeSvg(svgByCategory[params.category]);
  svgCache.set(key, uri);
  return uri;
}

