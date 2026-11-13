"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { KQ_LIEN_HE_MAC_DINH, KQ_PV_MAC_DINH } from "./kieu";

// Đọc 2 danh mục (kết quả liên hệ, kết quả phỏng vấn) từ bảng cau_hinh
export function useCauHinh() {
  const [kqLienHe, setKqLienHe] = useState<string[]>(KQ_LIEN_HE_MAC_DINH);
  const [kqPV, setKqPV] = useState<string[]>(KQ_PV_MAC_DINH);
  const [lan, setLan] = useState(0);

  useEffect(() => {
    supabase
      .from("cau_hinh")
      .select("khoa, gia_tri")
      .then(({ data }: { data: { khoa: string; gia_tri: unknown }[] | null }) => {
        for (const r of data ?? []) {
          if (!Array.isArray(r.gia_tri)) continue;
          const ds = (r.gia_tri as unknown[]).map(String);
          if (r.khoa === "ket_qua_lien_he") setKqLienHe(ds);
          if (r.khoa === "ket_qua_phong_van") setKqPV(ds);
        }
      });
  }, [lan]);

  return { kqLienHe, kqPV, taiLai: () => setLan((l) => l + 1) };
}
