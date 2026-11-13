"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCauHinh } from "@/lib/cauhinh";
import { CHUA_LIEN_HE, DAT_PV } from "@/lib/kieu";
import { nutChinh, nutNho, o } from "@/lib/ui";

async function luuDanhSach(khoa: string, ds: string[]): Promise<string> {
  const { error } = await supabase
    .from("cau_hinh")
    .upsert({ khoa, gia_tri: ds }, { onConflict: "khoa" });
  return error ? error.message : "";
}

export default function TrangCauHinh() {
  const { kqLienHe, kqPV } = useCauHinh();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">IV. CẤU HÌNH CÀI ĐẶT</h1>
      <p className="text-sm text-gray-600">
        Chỉnh sửa các danh mục lựa chọn (check list) dùng ở mục I. Mục có chữ “cố định” được
        chương trình dùng để tính toán nên không đổi tên hoặc xóa được.
      </p>

      {/* key giúp danh sách nạp lại đúng sau khi tải xong dữ liệu */}
      <DanhSachSua
        key={"lh-" + kqLienHe.join("|")}
        tieuDe="Kết quả liên hệ ứng viên"
        khoaCung={CHUA_LIEN_HE}
        hienTai={kqLienHe}
        luu={(ds) => luuDanhSach("ket_qua_lien_he", ds)}
      />
      <DanhSachSua
        key={"pv-" + kqPV.join("|")}
        tieuDe="Kết quả phỏng vấn"
        khoaCung={DAT_PV}
        hienTai={kqPV}
        luu={(ds) => luuDanhSach("ket_qua_phong_van", ds)}
      />
    </div>
  );
}

function DanhSachSua({
  tieuDe,
  khoaCung,
  hienTai,
  luu,
}: {
  tieuDe: string;
  khoaCung: string;
  hienTai: string[];
  luu: (ds: string[]) => Promise<string>;
}) {
  const [ds, setDs] = useState<string[]>(
    hienTai.includes(khoaCung) ? hienTai : [khoaCung, ...hienTai]
  );
  const [moi, setMoi] = useState("");
  const [tb, setTb] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  function them() {
    const t = moi.trim();
    if (!t) return;
    if (ds.includes(t)) {
      setLoi("Mục này đã có trong danh sách");
      return;
    }
    setLoi("");
    setTb("");
    setDs([...ds, t]);
    setMoi("");
  }

  async function luuLai() {
    const sach = ds.map((x) => x.trim());
    if (sach.some((x) => !x)) {
      setLoi("Có mục đang để trống");
      return;
    }
    if (new Set(sach).size !== sach.length) {
      setLoi("Có hai mục trùng tên");
      return;
    }
    setDang(true);
    setLoi("");
    const e = await luu(sach);
    setDang(false);
    if (e) setLoi(e);
    else setTb("Đã lưu");
  }

  return (
    <section className="space-y-3 rounded-xl bg-white p-4 shadow">
      <h2 className="font-semibold">{tieuDe}</h2>
      <ul className="space-y-2">
        {ds.map((x, i) => {
          const cung = x === khoaCung;
          return (
            <li key={i} className="flex items-center gap-2">
              <input
                className={o + (cung ? " bg-gray-100" : "")}
                value={x}
                disabled={cung}
                onChange={(e) => {
                  setTb("");
                  setDs(ds.map((y, j) => (j === i ? e.target.value : y)));
                }}
              />
              {cung ? (
                <span className="w-16 shrink-0 text-xs text-gray-500">cố định</span>
              ) : (
                <button
                  className={nutNho + " w-16 shrink-0 text-red-600"}
                  onClick={() => {
                    setTb("");
                    setDs(ds.filter((_, j) => j !== i));
                  }}
                >
                  Xóa
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2">
        <input
          className={o}
          placeholder="Thêm mục mới..."
          value={moi}
          onChange={(e) => setMoi(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              them();
            }
          }}
        />
        <button className={nutNho + " shrink-0"} onClick={them}>
          + Thêm
        </button>
      </div>

      <p className="text-xs text-amber-700">
        Lưu ý: đổi tên một mục sẽ không tự đổi tên ở các hồ sơ đã nhập trước đó. Nếu chỉ muốn
        bỏ một lựa chọn khỏi danh sách thì cứ xóa; hồ sơ cũ vẫn giữ nguyên chữ đã ghi.
      </p>

      {loi && <p className="text-sm text-red-600">{loi}</p>}
      {tb && <p className="text-sm text-green-700">{tb}</p>}
      <button className={nutChinh} disabled={dang} onClick={luuLai}>
        {dang ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </section>
  );
}
