"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { docFileXlsx } from "@/lib/docExcel";
import { chuanSDT, phanTichHang, type PhanTich, type UVNhap } from "@/lib/importUV";
import { fmtNgay, trinhDoHienThi, type UngVien } from "@/lib/kieu";
import { nutChinh, nutPhu } from "@/lib/ui";
import Modal from "./Modal";

type Dong = { so: number; uv: UVNhap; trung: string | null };

export default function ImportUV({
  dsHienCo,
  dong,
  xong,
}: {
  dsHienCo: UngVien[];
  dong: () => void;
  xong: () => void;
}) {
  const [tenFile, setTenFile] = useState("");
  const [kq, setKq] = useState<PhanTich | null>(null);
  const [loi, setLoi] = useState("");
  const [boQuaTrung, setBoQuaTrung] = useState(true);
  const [dang, setDang] = useState(false);
  const [tienDo, setTienDo] = useState("");
  const [daNhap, setDaNhap] = useState<number | null>(null);

  // Gắn cờ trùng số điện thoại (với hồ sơ đã có hoặc trùng ngay trong file)
  const cacDong: Dong[] = useMemo(() => {
    if (!kq) return [];
    const daCo = new Map<string, string>();
    for (const u of dsHienCo) {
      const s = chuanSDT(u.sdt);
      if (s) daCo.set(s, u.ma_uv ?? u.ho_ten);
    }
    const trongFile = new Set<string>();
    return kq.hopLe.map((h) => {
      const s = chuanSDT(h.uv.sdt);
      let trung: string | null = null;
      if (s) {
        if (daCo.has(s)) trung = "Trùng SĐT với " + daCo.get(s);
        else if (trongFile.has(s)) trung = "Trùng SĐT với dòng khác trong file";
        trongFile.add(s);
      }
      return { so: h.so, uv: h.uv, trung };
    });
  }, [kq, dsHienCo]);

  const soTrung = cacDong.filter((d) => d.trung).length;
  const canNhap = cacDong.filter((d) => !boQuaTrung || !d.trung);

  async function chonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLoi("");
    setKq(null);
    setTenFile(f.name);
    if (!/\.xlsx$/i.test(f.name)) {
      setLoi('Chỉ đọc được file Excel đuôi .xlsx. Nếu file là .xls hoặc .csv, hãy mở bằng Excel và chọn "Save As" → Excel Workbook (.xlsx).');
      return;
    }
    try {
      const hang = await docFileXlsx(await f.arrayBuffer());
      const pt = phanTichHang(hang);
      if (pt.tongHang === 0) {
        setLoi("File chưa có dòng dữ liệu nào bên dưới dòng tiêu đề.");
        return;
      }
      setKq(pt);
    } catch (err) {
      setLoi(err instanceof Error ? err.message : "Không đọc được file");
    }
  }

  async function nhap() {
    if (canNhap.length === 0) return;
    setDang(true);
    setLoi("");
    let xongSo = 0;
    for (let i = 0; i < canNhap.length; i += 100) {
      const lo = canNhap.slice(i, i + 100).map((d) => d.uv);
      setTienDo(`Đang nhập ${Math.min(i + 100, canNhap.length)}/${canNhap.length}...`);
      const { error } = await supabase.from("ung_vien").insert(lo);
      if (error) {
        setDang(false);
        setTienDo("");
        setLoi(
          `Đã nhập ${xongSo} hồ sơ, sau đó bị lỗi: ${error.message}. Bạn đừng nhập lại các hồ sơ đã vào để tránh bị trùng.`
        );
        if (xongSo > 0) setDaNhap(xongSo);
        return;
      }
      xongSo += lo.length;
    }
    setDang(false);
    setTienDo("");
    setDaNhap(xongSo);
  }

  return (
    <Modal tieuDe="Import hồ sơ ứng viên từ Excel" dong={daNhap !== null ? xong : dong} rong>
      {daNhap !== null ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-green-50 p-3 text-green-800">
            Đã nhập thành công <b>{daNhap}</b> hồ sơ ứng viên.
          </p>
          {loi && <p className="text-sm text-red-600">{loi}</p>}
          <div className="flex justify-end">
            <button className={nutChinh} onClick={xong}>
              Xem danh sách
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-gray-700">
            <li>
              Tải file Excel mẫu, điền danh sách ứng viên (mỗi ứng viên một dòng, chỉ cột Họ tên là bắt buộc).
            </li>
            <li>Chọn file đã điền (đuôi .xlsx), kiểm tra bản xem trước bên dưới rồi bấm Nhập.</li>
          </ol>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/mau/Mau-Import-UngVien.xlsx"
              download
              className={nutPhu + " inline-block"}
            >
              Tải file Excel mẫu
            </a>
            <input type="file" accept=".xlsx" onChange={chonFile} className="text-sm" />
          </div>

          {loi && <p className="whitespace-pre-line rounded-lg bg-red-50 p-3 text-red-700">{loi}</p>}

          {kq && (
            <div className="space-y-3">
              <p>
                File <b>{tenFile}</b>: đọc được <b>{kq.tongHang}</b> dòng —{" "}
                <span className="text-green-700">{kq.hopLe.length} hợp lệ</span>
                {soTrung > 0 && (
                  <>
                    , <span className="text-amber-700">{soTrung} trùng số điện thoại</span>
                  </>
                )}
                {kq.loi.length > 0 && (
                  <>
                    , <span className="text-red-700">{kq.loi.length} bị lỗi</span>
                  </>
                )}
                .
              </p>

              {kq.loi.length > 0 && (
                <div className="rounded-lg bg-red-50 p-3 text-red-800">
                  <p className="mb-1 font-semibold">Các dòng bị lỗi (sẽ không được nhập):</p>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {kq.loi.slice(0, 20).map((l) => (
                      <li key={l.so}>
                        Dòng {l.so}: {l.viec}
                      </li>
                    ))}
                  </ul>
                  {kq.loi.length > 20 && <p className="mt-1">... và {kq.loi.length - 20} dòng lỗi khác.</p>}
                  <p className="mt-1 text-xs">Bạn có thể sửa file rồi chọn lại, hoặc nhập các dòng hợp lệ trước.</p>
                </div>
              )}

              {soTrung > 0 && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={boQuaTrung}
                    onChange={(e) => setBoQuaTrung(e.target.checked)}
                  />
                  Bỏ qua các hồ sơ trùng số điện thoại ({soTrung} hồ sơ)
                </label>
              )}

              {cacDong.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1">Dòng</th>
                        <th className="px-2 py-1">Họ tên</th>
                        <th className="px-2 py-1">Ngày sinh</th>
                        <th className="px-2 py-1">SĐT</th>
                        <th className="px-2 py-1">Trình độ chuyên môn</th>
                        <th className="px-2 py-1">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cacDong.slice(0, 10).map((d) => (
                        <tr key={d.so} className="border-t">
                          <td className="px-2 py-1">{d.so}</td>
                          <td className="px-2 py-1 font-semibold">{d.uv.ho_ten}</td>
                          <td className="px-2 py-1">{fmtNgay(d.uv.ngay_sinh)}</td>
                          <td className="px-2 py-1">{d.uv.sdt}</td>
                          <td className="px-2 py-1">
                            {trinhDoHienThi(d.uv as unknown as UngVien)}
                          </td>
                          <td className="px-2 py-1 text-amber-700">{d.trung}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {cacDong.length > 10 && (
                    <p className="px-2 py-1 text-xs text-gray-500">
                      Hiển thị 10 dòng đầu trong {cacDong.length} dòng hợp lệ.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {tienDo && <p className="text-gray-700">{tienDo}</p>}

          <div className="flex justify-end gap-2">
            <button className={nutPhu} onClick={dong}>
              Hủy
            </button>
            <button className={nutChinh} disabled={dang || canNhap.length === 0} onClick={nhap}>
              {dang ? "Đang nhập..." : `Nhập ${canNhap.length} hồ sơ`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
