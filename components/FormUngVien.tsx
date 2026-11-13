"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { UngVien } from "@/lib/kieu";
import { nutChinh, nutPhu } from "@/lib/ui";
import Modal from "./Modal";
import TruongUV, { formTuUV, payloadTuForm, type FormUV } from "./TruongUV";

// Cửa sổ thêm / sửa ứng viên
export default function FormUngVien({
  uv,
  kqPV,
  dong,
  xong,
}: {
  uv: UngVien | null;
  kqPV: string[];
  dong: () => void;
  xong: () => void;
}) {
  const [f, setF] = useState<FormUV>(formTuUV(uv));
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    const du = payloadTuForm(f);
    const { error } = uv
      ? await supabase.from("ung_vien").update(du).eq("id", uv.id)
      : await supabase.from("ung_vien").insert(du);
    setDang(false);
    if (error) {
      setLoi(error.message);
      return;
    }
    xong();
  }

  return (
    <Modal tieuDe={uv ? "Sửa ứng viên " + (uv.ma_uv ?? "") : "Thêm ứng viên"} dong={dong}>
      <form onSubmit={gui} className="space-y-4">
        <TruongUV f={f} set={setF} kqPV={kqPV} />
        {loi && <p className="text-sm text-red-600">{loi}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={dong} className={nutPhu}>
            Hủy
          </button>
          <button disabled={dang} className={nutChinh}>
            {dang ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
