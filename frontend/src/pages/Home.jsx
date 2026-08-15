import { useEffect, useState } from "react";
import { shopApi } from "@/services/api";
import { useStore } from "@/context/StoreContext";
import { MegaMall } from "@/pages/homepages/MegaMall";
import { Bento } from "@/pages/homepages/Bento";
import { FlashFrenzy } from "@/pages/homepages/FlashFrenzy";
import { CategoryPillar } from "@/pages/homepages/CategoryPillar";
import { Immersive } from "@/pages/homepages/Immersive";
import { Loader2 } from "lucide-react";

const MAP = {
  layout_mega_mall: MegaMall,
  layout_bento: Bento,
  layout_flash_frenzy: FlashFrenzy,
  layout_category_pillar: CategoryPillar,
  layout_immersive: Immersive,
};

export default function Home() {
  const { config, activeLayout } = useStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      shopApi.categories(),
      shopApi.products({ limit: 24, sort: "popular" }),
      shopApi.products({ limit: 12, deal: 1, sort: "discount" }),
      shopApi.products({ limit: 8, sort: "rating" }),
    ]).then(([categories, all, deals, top]) => {
      setData({ categories, products: all.items, deals: deals.items, top: top.items });
    });
  }, []);

  if (!config || !data) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--primary)" }} /></div>;
  }
  const Layout = MAP[activeLayout] || MegaMall;
  return <div className="fade-up"><Layout data={data} banners={config.banners} /></div>;
}
