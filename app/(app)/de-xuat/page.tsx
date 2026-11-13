"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCauHinh } from "@/lib/cauhinh";
import {
  DAT_PV,
  TINH_TRANG_HS,
  TRA_HO_SO,
  thongBaoLoi,
  type BoSung,
  type DeXuat,
  type UngVien,
  trinhDoHienThi,
} from "@/lib/kieu";
import { taoPhieuDeXuat, xuatPhieuDeXuat } from "@/lib/xuatWord";
import { taiDanhSachDeXuat } from "@/lib/xuatExcel";
import { nhan, nutChinh, nutNho, nutPhu, o, oNho } from "@/lib/ui";
import Modal from "@/components/Modal";
import XemTruocWord from "@/components/XemTruocWord";
import TruongUV, { formTuUV, payloadTuForm, type FormUV } from "@/components/TruongUV";

type FormDX = {
  vi_tri: string;
  phong_ban: string;
  don_vi: string;
  uu_diem: string;
  han_che: string;
  muc_luong: string;
  don_vi_tinh: string;
  anh_the: string;
  nguoi_de_xuat: string;
  bo_sung: BoSung;
  tinh_trang: string;
  ly_do_tra: string;
};

function formTuDX(d: DeXuat | null): FormDX {
  return {
    vi_tri: d?.vi_tri ?? "",
    phong_ban: d?.phong_ban ?? "",
    don_vi: d?.don_vi ?? "",
    uu_diem: d?.uu_diem ?? "",
    han_che: d?.han_che ?? "",
    muc_luong: d?.muc_luong ?? "",
    don_vi_tinh: d?.don_vi_tinh ?? "VNĐ",
    anh_the: d?.anh_the ?? "",
    nguoi_de_xuat: d?.nguoi_de_xuat ?? "",
    bo_sung: d?.bo_sung ?? {},
    tinh_trang: d?.tinh_trang ?? "Chưa trình",
    ly_do_tra: d?.ly_do_tra ?? "",
  };
}

// Thu nhỏ ảnh thẻ (cạnh dài tối đa 480px) để lưu nhẹ trong cơ sở dữ liệu
function docAnhThe(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ti = Math.min(1, 480 / Math.max(img.width, img.height));
      const w = Math.round(img.width * ti);
      const h = Math.round(img.height * ti);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Không xử lý được ảnh"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được file ảnh"));
    };
    img.src = url;
  });
}

// Bố cục bảng trên màn hình lớn; màn hình nhỏ tự chuyển thành thẻ xếp dọc
const LUOI = "xl:grid xl:grid-cols-[80px_1.1fr_1.2fr_1.5fr_1.3fr_140px] xl:gap-3";

function Cot({ ten, children }: { ten: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-0.5 block text-xs font-semibold text-gray-500 xl:hidden">
        {ten}
      </span>
      {children}
    </div>
  );
}

export default function TrangDeXuat() {
  const { kqPV } = useCauHinh();
  const [ds, setDs] = useState<UngVien[]>([]);
  const [dxs, setDxs] = useState<DeXuat[]>([]);
  const [lan, setLan] = useState(0);
  const [loi, setLoi] = useState("");
  const [tim, setTim] = useState("");
  const [loc, setLoc] = useState("");
  const [locTT, setLocTT] = useState("");
  const [mo, setMo] = useState<UngVien | null>(null);
  const [moLyDo, setMoLyDo] = useState<{ uv: UngVien; dx: DeXuat } | null>(null);
  const [xem, setXem] = useState<{ bytes: Uint8Array; tenFile: string } | null>(null);

  const taiLai = () => setLan((l) => l + 1);

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([
        supabase
          .from("ung_vien")
          .select("*")
          .eq("ket_qua_pv", DAT_PV)
          .order("ngay_ung_tuyen", { ascending: false }),
        supabase.from("de_xuat").select("*"),
      ]);
      if (a.error) setLoi(thongBaoLoi(a.error.message));
      else if (b.error) setLoi(thongBaoLoi(b.error.message));
      else {
        setLoi("");
        setDs((a.data ?? []) as UngVien[]);
        setDxs((b.data ?? []) as DeXuat[]);
      }
    })();
  }, [lan]);

  const dxTheoUV = useMemo(() => {
    const m = new Map<string, DeXuat>();
    for (const d of dxs) m.set(d.ung_vien_id, d);
    return m;
  }, [dxs]);

  const k = tim.trim().toLowerCase();
  const hienThi = ds.filter((u) => {
    const d = dxTheoUV.get(u.id);
    if (loc === "da" && !d) return false;
    if (loc === "chua" && d) return false;
    if (locTT && (!d || (d.tinh_trang ?? "Chưa trình") !== locTT)) return false;
    if (k && ![u.ho_ten, u.ma_uv, u.sdt].some((x) => (x ?? "").toLowerCase().includes(k)))
      return false;
    return true;
  });

  async function xuatNhanh(u: UngVien, d: DeXuat) {
    try {
      await xuatPhieuDeXuat(u, d);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không xuất được file Word");
    }
  }

  async function xemNhanh(u: UngVien, d: DeXuat) {
    try {
      setXem(await taoPhieuDeXuat(u, d));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tạo được bản xem trước");
    }
  }

  async function taiExcel() {
    try {
      await taiDanhSachDeXuat(hienThi.map((u) => ({ uv: u, dx: dxTheoUV.get(u.id) ?? null })));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tạo được file Excel");
    }
  }

  async function doiTinhTrang(u: UngVien, d: DeXuat, v: string) {
    if (v === TRA_HO_SO) {
      setMoLyDo({ uv: u, dx: d }); // hỏi lý do trước khi lưu
      return;
    }
    const { error } = await supabase
      .from("de_xuat")
      .update({ tinh_trang: v, ly_do_tra: null })
      .eq("id", d.id);
    if (error) setLoi(thongBaoLoi(error.message));
    else taiLai();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">II. QUẢN LÝ ĐỀ XUẤT TUYỂN DỤNG</h1>
        <button className={nutPhu} onClick={taiExcel} disabled={hienThi.length === 0}>
          Tải danh sách Excel ({hienThi.length})
        </button>
      </div>
      <p className="text-sm text-gray-600">
        Danh sách dưới đây gồm các ứng viên có kết quả <b>{DAT_PV}</b> (đặt ở mục I).
      </p>

      <div className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow sm:grid-cols-3">
        <div>
          <label className={nhan}>Tìm nhanh</label>
          <input
            className={o}
            placeholder="Tên, SĐT, mã UV..."
            value={tim}
            onChange={(e) => setTim(e.target.value)}
          />
        </div>
        <div>
          <label className={nhan}>Lập đề xuất</label>
          <select className={o} value={loc} onChange={(e) => setLoc(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="chua">Chưa lập đề xuất</option>
            <option value="da">Đã lập đề xuất</option>
          </select>
        </div>
        <div>
          <label className={nhan}>Tình trạng hồ sơ</label>
          <select className={o} value={locTT} onChange={(e) => setLocTT(e.target.value)}>
            <option value="">Tất cả</option>
            {TINH_TRANG_HS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {loi && <p className="text-sm text-red-600">{loi}</p>}

      {/* Tiêu đề cột (chỉ hiện trên màn hình lớn) */}
      <div
        className={
          "hidden rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white " +
          LUOI
        }
      >
        <div>Mã UV</div>
        <div>Thông tin ứng viên</div>
        <div>Trình độ chuyên môn</div>
        <div>Nội dung đề xuất</div>
        <div>Tình trạng hồ sơ</div>
        <div>Thao tác</div>
      </div>

      {hienThi.map((u) => {
        const d = dxTheoUV.get(u.id) ?? null;
        const tt = d?.tinh_trang ?? "Chưa trình";
        return (
          <div
            key={u.id}
            className={
              "space-y-3 rounded-xl bg-white p-4 text-sm shadow xl:space-y-0 xl:rounded-lg " +
              LUOI
            }
          >
            <Cot ten="Mã UV">
              <span className="font-mono">{u.ma_uv}</span>
            </Cot>
            <Cot ten="Thông tin ứng viên">
              <p className="font-bold">{u.ho_ten}</p>
              {u.sdt && <p>SĐT: {u.sdt}</p>}
            </Cot>
            <Cot ten="Trình độ chuyên môn">{trinhDoHienThi(u)}</Cot>
            <Cot ten="Nội dung đề xuất">
              {d ? (
                <div className="space-y-0.5">
                  <p>
                    <b>Vị trí:</b> {d.vi_tri || "—"}
                  </p>
                  <p>
                    <b>Phòng ban:</b> {d.phong_ban || "—"}
                  </p>
                  <p>
                    <b>Đơn vị/Xí nghiệp:</b> {d.don_vi || "—"}
                  </p>
                  {d.muc_luong && (
                    <p>
                      <b>Mức lương:</b> {d.muc_luong} {d.don_vi_tinh}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-amber-700">Chưa lập đề xuất</p>
              )}
            </Cot>
            <Cot ten="Tình trạng hồ sơ">
              {d ? (
                <div className="space-y-1">
                  <select
                    className={oNho}
                    value={tt}
                    onChange={(e) => doiTinhTrang(u, d, e.target.value)}
                  >
                    {TINH_TRANG_HS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  {tt === TRA_HO_SO && (
                    <div className="rounded-lg bg-red-50 p-2 text-xs text-red-800">
                      <p>Lý do: {d.ly_do_tra || "(chưa nhập)"}</p>
                      <button
                        className={nutNho + " mt-1"}
                        onClick={() => setMoLyDo({ uv: u, dx: d })}
                      >
                        Sửa lý do
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Lập đề xuất trước</p>
              )}
            </Cot>
            <Cot ten="Thao tác">
              <div className="flex flex-wrap gap-2 xl:flex-col">
                <button className={nutChinh} onClick={() => setMo(u)}>
                  {d ? "Sửa đề xuất" : "Lập đề xuất"}
                </button>
                {d && (
                  <button className={nutPhu} onClick={() => xemNhanh(u, d)}>
                    Xem trước
                  </button>
                )}
                {d && (
                  <button className={nutPhu} onClick={() => xuatNhanh(u, d)}>
                    Xuất Word
                  </button>
                )}
              </div>
            </Cot>
          </div>
        );
      })}

      {hienThi.length === 0 && (
        <p className="py-8 text-center text-gray-500">
          Không có ứng viên phù hợp.
        </p>
      )}

      {mo && (
        <FormDeXuat
          uv={mo}
          dx={dxTheoUV.get(mo.id) ?? null}
          kqPV={kqPV}
          goiY={{
            don_vi: dxs.map((x) => x.don_vi ?? ""),
            phong_ban: dxs.map((x) => x.phong_ban ?? ""),
            vi_tri: dxs.map((x) => x.vi_tri ?? ""),
          }}
          dong={() => setMo(null)}
          xong={() => {
            setMo(null);
            taiLai();
          }}
        />
      )}

      {xem && (
        <XemTruocWord bytes={xem.bytes} tenFile={xem.tenFile} dong={() => setXem(null)} />
      )}

      {moLyDo && (
        <FormLyDo
          uv={moLyDo.uv}
          dx={moLyDo.dx}
          dong={() => setMoLyDo(null)}
          xong={() => {
            setMoLyDo(null);
            taiLai();
          }}
        />
      )}
    </div>
  );
}

// Cửa sổ nhập lý do khi hồ sơ bị trả
function FormLyDo({
  uv,
  dx,
  dong,
  xong,
}: {
  uv: UngVien;
  dx: DeXuat;
  dong: () => void;
  xong: () => void;
}) {
  const [lyDo, setLyDo] = useState(dx.ly_do_tra ?? "");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    const { error } = await supabase
      .from("de_xuat")
      .update({ tinh_trang: TRA_HO_SO, ly_do_tra: lyDo.trim() || null })
      .eq("id", dx.id);
    setDang(false);
    if (error) {
      setLoi(thongBaoLoi(error.message));
      return;
    }
    xong();
  }

  return (
    <Modal tieuDe={"Hồ sơ bị trả — " + uv.ho_ten} dong={dong}>
      <form onSubmit={gui} className="space-y-3">
        <div>
          <label className={nhan}>Lý do bị trả hồ sơ</label>
          <textarea
            className={o}
            rows={3}
            value={lyDo}
            onChange={(e) => setLyDo(e.target.value)}
            placeholder="Nhập lý do hồ sơ bị trả lại"
          />
        </div>
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

const duy = (a: string[]) => Array.from(new Set(a.filter((x) => x.trim())));

function FormDeXuat({
  uv,
  dx,
  kqPV,
  goiY,
  dong,
  xong,
}: {
  uv: UngVien;
  dx: DeXuat | null;
  kqPV: string[];
  goiY: { don_vi: string[]; phong_ban: string[]; vi_tri: string[] };
  dong: () => void;
  xong: () => void;
}) {
  const [fUV, setFUV] = useState<FormUV>(formTuUV(uv));
  const [f, setF] = useState<FormDX>(formTuDX(dx));
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const [xem, setXem] = useState<{ bytes: Uint8Array; tenFile: string } | null>(null);

  const c =
    (k: keyof FormDX) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });
  const b =
    (k: keyof BoSung) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, bo_sung: { ...f.bo_sung, [k]: e.target.value } });

  async function chonAnh(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setF({ ...f, anh_the: await docAnhThe(file) });
      setLoi("");
    } catch (err) {
      setLoi(err instanceof Error ? err.message : "Không đọc được ảnh");
    }
  }

  function layDuDX() {
    return {
      vi_tri: f.vi_tri.trim() || null,
      phong_ban: f.phong_ban.trim() || null,
      don_vi: f.don_vi.trim() || null,
      uu_diem: f.uu_diem.trim() || null,
      han_che: f.han_che.trim() || null,
      muc_luong: f.muc_luong.trim() || null,
      don_vi_tinh: f.don_vi_tinh || null,
      anh_the: f.anh_the || null,
      nguoi_de_xuat: f.nguoi_de_xuat.trim() || null,
      bo_sung: f.bo_sung,
      tinh_trang: f.tinh_trang || "Chưa trình",
      ly_do_tra: f.tinh_trang === TRA_HO_SO ? f.ly_do_tra.trim() || null : null,
    };
  }

  async function xemTruoc() {
    if (!fUV.ho_ten.trim()) {
      setLoi("Họ tên ứng viên không được để trống");
      return;
    }
    setDang(true);
    setLoi("");
    try {
      setXem(
        await taoPhieuDeXuat(
          { ...uv, ...payloadTuForm(fUV) } as UngVien,
          layDuDX() as Omit<DeXuat, "id" | "ung_vien_id">
        )
      );
    } catch (err) {
      setLoi(err instanceof Error ? err.message : "Không tạo được bản xem trước");
    }
    setDang(false);
  }

  async function luu(xuat: boolean) {
    if (!fUV.ho_ten.trim()) {
      setLoi("Họ tên ứng viên không được để trống");
      return;
    }
    setDang(true);
    setLoi("");
    const duUV = payloadTuForm(fUV);
    const e1 = await supabase.from("ung_vien").update(duUV).eq("id", uv.id);
    if (e1.error) {
      setDang(false);
      setLoi(thongBaoLoi(e1.error.message));
      return;
    }
    const duDX = layDuDX();
    const e2 = await supabase
      .from("de_xuat")
      .upsert(
        { ung_vien_id: uv.id, ...duDX, updated_at: new Date().toISOString() },
        { onConflict: "ung_vien_id" }
      );
    if (e2.error) {
      setDang(false);
      setLoi(thongBaoLoi(e2.error.message));
      return;
    }
    if (xuat) {
      try {
        await xuatPhieuDeXuat({ ...uv, ...duUV } as UngVien, duDX as Omit<DeXuat, "id" | "ung_vien_id">);
      } catch (err) {
        setDang(false);
        setLoi(
          "Đã lưu, nhưng chưa xuất được Word: " +
            (err instanceof Error ? err.message : "lỗi không rõ")
        );
        return;
      }
    }
    setDang(false);
    xong();
  }

  return (
    <Modal tieuDe={"Đề xuất tuyển dụng — " + uv.ho_ten} dong={dong} rong>
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="font-semibold text-green-800">1. Thông tin ứng viên (có thể chỉnh sửa)</h3>
          <TruongUV f={fUV} set={setFUV} kqPV={kqPV} hienKQPV={false} />
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-green-800">2. Nội dung đề xuất</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={nhan}>Vị trí tuyển dụng *</label>
              <input className={o} list="gy-vi-tri" value={f.vi_tri} onChange={c("vi_tri")} />
            </div>
            <div>
              <label className={nhan}>Phòng ban</label>
              <input className={o} list="gy-phong-ban" value={f.phong_ban} onChange={c("phong_ban")} />
            </div>
            <div>
              <label className={nhan}>Đơn vị / Xí nghiệp</label>
              <input className={o} list="gy-don-vi" value={f.don_vi} onChange={c("don_vi")} />
            </div>
            <div className="sm:col-span-2">
              <label className={nhan}>Nhận xét và đánh giá — Ưu điểm</label>
              <textarea className={o} rows={2} value={f.uu_diem} onChange={c("uu_diem")} />
            </div>
            <div className="sm:col-span-2">
              <label className={nhan}>Nhận xét và đánh giá — Hạn chế</label>
              <textarea className={o} rows={2} value={f.han_che} onChange={c("han_che")} />
            </div>
            <div>
              <label className={nhan}>Mức lương</label>
              <input className={o} value={f.muc_luong} onChange={c("muc_luong")} placeholder="8.000.000" />
            </div>
            <div>
              <label className={nhan}>Đơn vị tính</label>
              <select className={o} value={f.don_vi_tinh} onChange={c("don_vi_tinh")}>
                <option>VNĐ</option>
                <option>LAK</option>
                <option>USD</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={nhan}>Tình trạng hồ sơ</label>
              <select className={o} value={f.tinh_trang} onChange={c("tinh_trang")}>
                {TINH_TRANG_HS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            {f.tinh_trang === TRA_HO_SO && (
              <div className="sm:col-span-2">
                <label className={nhan}>Lý do bị trả hồ sơ</label>
                <textarea
                  className={o}
                  rows={2}
                  value={f.ly_do_tra}
                  onChange={c("ly_do_tra")}
                  placeholder="Nhập lý do hồ sơ bị trả lại"
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={nhan}>Ảnh thẻ (tải từ máy)</label>
              <input type="file" accept="image/*" onChange={chonAnh} className="text-sm" />
              {f.anh_the && (
                <div className="mt-2 flex items-end gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.anh_the} alt="Ảnh thẻ" className="h-32 rounded border" />
                  <button
                    type="button"
                    className={nutNho}
                    onClick={() => setF({ ...f, anh_the: "" })}
                  >
                    Bỏ ảnh
                  </button>
                </div>
              )}
            </div>
          </div>
          <datalist id="gy-vi-tri">
            {duy(goiY.vi_tri).map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
          <datalist id="gy-phong-ban">
            {duy(goiY.phong_ban).map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
          <datalist id="gy-don-vi">
            {duy(goiY.don_vi).map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </section>

        <details className="rounded-lg border border-gray-200 p-3">
          <summary className="cursor-pointer font-semibold text-green-800">
            3. Thông tin bổ sung cho phiếu (không bắt buộc — để trống thì phiếu Word để trống)
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={nhan}>Giới tính</label>
              <select className={o} value={f.bo_sung.gioi_tinh ?? ""} onChange={b("gioi_tinh")}>
                <option value="">—</option>
                <option>Nam</option>
                <option>Nữ</option>
              </select>
            </div>
            <div>
              <label className={nhan}>Nơi sinh</label>
              <input className={o} value={f.bo_sung.noi_sinh ?? ""} onChange={b("noi_sinh")} />
            </div>
            <div>
              <label className={nhan}>Quê quán</label>
              <input className={o} value={f.bo_sung.que_quan ?? ""} onChange={b("que_quan")} />
            </div>
            <div>
              <label className={nhan}>Số CCCD / hộ chiếu</label>
              <input className={o} value={f.bo_sung.cccd_so ?? ""} onChange={b("cccd_so")} />
            </div>
            <div>
              <label className={nhan}>Ngày cấp</label>
              <input className={o} value={f.bo_sung.cccd_ngay ?? ""} onChange={b("cccd_ngay")} placeholder="dd/mm/yyyy" />
            </div>
            <div>
              <label className={nhan}>Nơi cấp</label>
              <input className={o} value={f.bo_sung.cccd_noi ?? ""} onChange={b("cccd_noi")} />
            </div>
            <div>
              <label className={nhan}>Tình trạng gia đình</label>
              <input className={o} value={f.bo_sung.gia_dinh ?? ""} onChange={b("gia_dinh")} placeholder="Độc thân / Có gia đình" />
            </div>
            <div>
              <label className={nhan}>Số con</label>
              <input className={o} value={f.bo_sung.so_con ?? ""} onChange={b("so_con")} />
            </div>
            <div>
              <label className={nhan}>Chiều cao (cm)</label>
              <input className={o} value={f.bo_sung.chieu_cao ?? ""} onChange={b("chieu_cao")} />
            </div>
            <div>
              <label className={nhan}>Cân nặng (kg)</label>
              <input className={o} value={f.bo_sung.can_nang ?? ""} onChange={b("can_nang")} />
            </div>
            <div className="sm:col-span-2">
              <label className={nhan}>Nơi ở hiện nay</label>
              <input className={o} value={f.bo_sung.noi_o ?? ""} onChange={b("noi_o")} />
            </div>
            <div className="sm:col-span-2">
              <label className={nhan}>Nơi làm việc chính</label>
              <input className={o} value={f.bo_sung.noi_lam_viec ?? ""} onChange={b("noi_lam_viec")} />
            </div>
            <div>
              <label className={nhan}>Người phỏng vấn 1 (họ tên - chức vụ)</label>
              <input className={o} value={f.bo_sung.nguoi_pv_1 ?? ""} onChange={b("nguoi_pv_1")} />
            </div>
            <div>
              <label className={nhan}>Người phỏng vấn 2 (họ tên - chức vụ)</label>
              <input className={o} value={f.bo_sung.nguoi_pv_2 ?? ""} onChange={b("nguoi_pv_2")} />
            </div>
            <div className="sm:col-span-2">
              <label className={nhan}>Người đề xuất (Giám đốc XN) — in ở cuối phiếu</label>
              <input className={o} value={f.nguoi_de_xuat} onChange={c("nguoi_de_xuat")} />
            </div>
          </div>
        </details>

        {xem && (
          <XemTruocWord bytes={xem.bytes} tenFile={xem.tenFile} dong={() => setXem(null)} />
        )}

        {loi && <p className="text-sm text-red-600">{loi}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={dong} className={nutPhu}>
            Hủy
          </button>
          <button type="button" disabled={dang} onClick={xemTruoc} className={nutPhu}>
            Xem trước
          </button>
          <button type="button" disabled={dang} onClick={() => luu(false)} className={nutPhu}>
            Lưu
          </button>
          <button type="button" disabled={dang} onClick={() => luu(true)} className={nutChinh}>
            {dang ? "Đang xử lý..." : "Lưu & xuất Word"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
