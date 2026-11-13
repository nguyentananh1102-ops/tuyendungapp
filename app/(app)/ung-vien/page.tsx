"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCauHinh } from "@/lib/cauhinh";
import {
  CHUA_LIEN_HE,
  HINH_THUC_PV,
  type LienHe,
  type PhongVan,
  type UngVien,
  fmtNgay,
  fmtNgayGio,
  fromInputDT,
  ketQuaLienHeMoiNhat,
  thongBaoLoi,
  ngayLocal,
  toInputDT,
  trinhDoHienThi,
} from "@/lib/kieu";
import { nhan, nutChinh, nutNho, nutPhu, o, oNho } from "@/lib/ui";
import Modal from "@/components/Modal";
import FormUngVien from "@/components/FormUngVien";
import ImportUV from "@/components/ImportUV";

const KHONG_CO = "__khong_co__";

// Bố cục bảng trên màn hình lớn; màn hình nhỏ tự chuyển thành thẻ xếp dọc
const LUOI =
  "xl:grid xl:grid-cols-[70px_100px_1.15fr_1.15fr_1fr_1.4fr_1.4fr_125px_60px] xl:gap-3";

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

export default function TrangUngVien() {
  const { kqLienHe, kqPV } = useCauHinh();
  const [ds, setDs] = useState<UngVien[]>([]);
  const [lh, setLh] = useState<LienHe[]>([]);
  const [pv, setPv] = useState<PhongVan[]>([]);
  const [lan, setLan] = useState(0);
  const [loi, setLoi] = useState("");

  const [tu, setTu] = useState("");
  const [den, setDen] = useState("");
  const [locLH, setLocLH] = useState("");
  const [locPV, setLocPV] = useState("");
  const [tim, setTim] = useState("");

  const [formUV, setFormUV] = useState<UngVien | "moi" | null>(null);
  const [moImport, setMoImport] = useState(false);
  const [formLH, setFormLH] = useState<{ uv: UngVien; lh: LienHe | null } | null>(null);
  const [formPV, setFormPV] = useState<{ uv: UngVien; pv: PhongVan | null } | null>(null);

  const taiLai = () => setLan((l) => l + 1);

  useEffect(() => {
    (async () => {
      const [a, b, c] = await Promise.all([
        supabase
          .from("ung_vien")
          .select("*")
          .order("ngay_ung_tuyen", { ascending: false }),
        supabase.from("lien_he").select("*").order("ngay", { ascending: true }),
        supabase.from("phong_van").select("*").order("ngay", { ascending: true }),
      ]);
      const e = a.error ?? b.error ?? c.error;
      if (e) setLoi(thongBaoLoi(e.message));
      else {
        setLoi("");
        setDs((a.data ?? []) as UngVien[]);
        setLh((b.data ?? []) as LienHe[]);
        setPv((c.data ?? []) as PhongVan[]);
      }
    })();
  }, [lan]);

  const lhTheoUV = useMemo(() => {
    const m = new Map<string, LienHe[]>();
    for (const x of lh) {
      const a = m.get(x.ung_vien_id) ?? [];
      a.push(x);
      m.set(x.ung_vien_id, a);
    }
    return m;
  }, [lh]);

  const pvTheoUV = useMemo(() => {
    const m = new Map<string, PhongVan[]>();
    for (const x of pv) {
      const a = m.get(x.ung_vien_id) ?? [];
      a.push(x);
      m.set(x.ung_vien_id, a);
    }
    return m;
  }, [pv]);

  const goiYViTri = useMemo(
    () => Array.from(new Set(pv.map((x) => (x.vi_tri ?? "").trim()).filter(Boolean))),
    [pv]
  );

  const k = tim.trim().toLowerCase();
  const hienThi = ds.filter((u) => {
    const ngay = ngayLocal(u.ngay_ung_tuyen);
    if (tu && ngay < tu) return false;
    if (den && ngay > den) return false;
    if (locLH && ketQuaLienHeMoiNhat(lhTheoUV.get(u.id) ?? []) !== locLH) return false;
    if (locPV === KHONG_CO && u.ket_qua_pv) return false;
    if (locPV && locPV !== KHONG_CO && u.ket_qua_pv !== locPV) return false;
    if (
      k &&
      ![u.ho_ten, u.sdt, u.ma_uv, u.dia_chi].some((x) =>
        (x ?? "").toLowerCase().includes(k)
      )
    )
      return false;
    return true;
  });

  async function doiKQPV(id: string, v: string) {
    const { error } = await supabase
      .from("ung_vien")
      .update({ ket_qua_pv: v || null })
      .eq("id", id);
    if (error) setLoi(thongBaoLoi(error.message));
    else taiLai();
  }

  async function xoaUV(u: UngVien) {
    if (
      !confirm(
        `Xóa ứng viên ${u.ho_ten}?\nLịch sử liên hệ và đề xuất của ứng viên này cũng bị xóa.`
      )
    )
      return;
    const { error } = await supabase.from("ung_vien").delete().eq("id", u.id);
    if (error) setLoi(thongBaoLoi(error.message));
    else taiLai();
  }

  async function xoaLH(x: LienHe) {
    if (!confirm("Xóa lần liên hệ này?")) return;
    const { error } = await supabase.from("lien_he").delete().eq("id", x.id);
    if (error) setLoi(thongBaoLoi(error.message));
    else taiLai();
  }

  async function xoaPV(x: PhongVan) {
    if (!confirm("Xóa lần phỏng vấn này?")) return;
    const { error } = await supabase.from("phong_van").delete().eq("id", x.id);
    if (error) setLoi(thongBaoLoi(error.message));
    else taiLai();
  }

  function xoaLoc() {
    setTu("");
    setDen("");
    setLocLH("");
    setLocPV("");
    setTim("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">I. QUẢN LÝ ỨNG VIÊN</h1>
        <div className="flex flex-wrap gap-2">
          <button className={nutPhu} onClick={() => setMoImport(true)}>
            Import hồ sơ ứng viên
          </button>
          <button className={nutChinh} onClick={() => setFormUV("moi")}>
            + Thêm ứng viên
          </button>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className={nhan}>Ứng tuyển từ ngày</label>
          <input className={o} type="date" value={tu} onChange={(e) => setTu(e.target.value)} />
        </div>
        <div>
          <label className={nhan}>đến ngày</label>
          <input className={o} type="date" value={den} onChange={(e) => setDen(e.target.value)} />
        </div>
        <div>
          <label className={nhan}>Kết quả liên hệ</label>
          <select className={o} value={locLH} onChange={(e) => setLocLH(e.target.value)}>
            <option value="">Tất cả</option>
            {kqLienHe.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={nhan}>Kết quả phỏng vấn</label>
          <select className={o} value={locPV} onChange={(e) => setLocPV(e.target.value)}>
            <option value="">Tất cả</option>
            <option value={KHONG_CO}>Chưa có kết quả</option>
            {kqPV.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={nhan}>Tìm nhanh</label>
          <input
            className={o}
            placeholder="Tên, SĐT, mã UV..."
            value={tim}
            onChange={(e) => setTim(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2 xl:col-span-5">
          <button className={nutNho} onClick={xoaLoc}>
            Xóa bộ lọc
          </button>
          <span className="ml-3 text-sm text-gray-600">
            Hiển thị {hienThi.length} / {ds.length} ứng viên
          </span>
        </div>
      </div>

      {loi && <p className="text-sm text-red-600">{loi}</p>}

      <div className="xl:overflow-x-auto">
      <div className="space-y-3 xl:min-w-[1200px]">
      {/* Tiêu đề cột (chỉ hiện trên màn hình lớn) */}
      <div
        className={
          "hidden rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white " +
          LUOI
        }
      >
        <div>Mã UV</div>
        <div>Thời gian ứng tuyển</div>
        <div>Thông tin ứng viên</div>
        <div>Trình độ chuyên môn</div>
        <div>Kinh nghiệm làm việc</div>
        <div>Lịch sử liên hệ</div>
        <div>Lịch sử phỏng vấn</div>
        <div>Kết quả phỏng vấn</div>
        <div>Thao tác</div>
      </div>

      {hienThi.map((u) => {
        const dsLH = lhTheoUV.get(u.id) ?? [];
        const dsPV = pvTheoUV.get(u.id) ?? [];
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
            <Cot ten="Thời gian ứng tuyển">{fmtNgayGio(u.ngay_ung_tuyen)}</Cot>
            <Cot ten="Thông tin ứng viên">
              <p className="font-bold">{u.ho_ten}</p>
              {u.ngay_sinh && <p>Ngày sinh: {fmtNgay(u.ngay_sinh)}</p>}
              {u.dia_chi && <p>Địa chỉ: {u.dia_chi}</p>}
              {u.sdt && (
                <p>
                  SĐT:{" "}
                  <a className="text-green-700 underline" href={"tel:" + u.sdt}>
                    {u.sdt}
                  </a>
                </p>
              )}
            </Cot>
            <Cot ten="Trình độ chuyên môn">{trinhDoHienThi(u)}</Cot>
            <Cot ten="Kinh nghiệm làm việc">
              <p className="whitespace-pre-line">{u.kinh_nghiem}</p>
            </Cot>
            <Cot ten="Lịch sử liên hệ">
              {dsLH.length === 0 && (
                <p className="text-gray-500">{CHUA_LIEN_HE}</p>
              )}
              <ul className="space-y-1">
                {dsLH.map((x) => (
                  <li key={x.id} className="flex items-start justify-between gap-1">
                    <span>
                      <span className="font-medium">{fmtNgayGio(x.ngay)}:</span>{" "}
                      {x.ket_qua}
                      {x.noi_dung ? " — " + x.noi_dung : ""}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        className="text-gray-500 hover:text-green-700"
                        title="Sửa"
                        onClick={() => setFormLH({ uv: u, lh: x })}
                      >
                        ✎
                      </button>
                      <button
                        className="text-gray-500 hover:text-red-600"
                        title="Xóa"
                        onClick={() => xoaLH(x)}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <button
                className={nutNho + " mt-2"}
                onClick={() => setFormLH({ uv: u, lh: null })}
              >
                + Thêm lần liên hệ
              </button>
            </Cot>
            <Cot ten="Lịch sử phỏng vấn">
              {dsPV.length === 0 && <p className="text-gray-500">Chưa phỏng vấn</p>}
              <ul className="space-y-2">
                {dsPV.map((x) => (
                  <li key={x.id} className="flex items-start justify-between gap-1">
                    <span>
                      <span className="font-medium">{fmtNgayGio(x.ngay)}</span>
                      {x.hinh_thuc ? " • " + x.hinh_thuc : ""}
                      {x.vi_tri && <span className="block">Vị trí: {x.vi_tri}</span>}
                      <span className="block">
                        Kết quả: {x.ket_qua || "Chưa có kết quả"}
                      </span>
                      {x.nhan_xet && (
                        <span className="block text-gray-600">Ghi chú: {x.nhan_xet}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        className="text-gray-500 hover:text-green-700"
                        title="Sửa"
                        onClick={() => setFormPV({ uv: u, pv: x })}
                      >
                        ✎
                      </button>
                      <button
                        className="text-gray-500 hover:text-red-600"
                        title="Xóa"
                        onClick={() => xoaPV(x)}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <button
                className={nutNho + " mt-2"}
                onClick={() => setFormPV({ uv: u, pv: null })}
              >
                + Thêm lần phỏng vấn
              </button>
            </Cot>
            <Cot ten="Kết quả phỏng vấn">
              <select
                className={oNho}
                value={u.ket_qua_pv ?? ""}
                onChange={(e) => doiKQPV(u.id, e.target.value)}
              >
                <option value="">— Chưa có —</option>
                {kqPV.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Cot>
            <Cot ten="Thao tác">
              <div className="flex gap-2 xl:flex-col">
                <button className={nutNho} onClick={() => setFormUV(u)}>
                  Sửa
                </button>
                <button
                  className={nutNho + " text-red-600"}
                  onClick={() => xoaUV(u)}
                >
                  Xóa
                </button>
              </div>
            </Cot>
          </div>
        );
      })}
      </div>
      </div>

      {hienThi.length === 0 && (
        <p className="py-8 text-center text-gray-500">Không có ứng viên phù hợp.</p>
      )}

      {formUV && (
        <FormUngVien
          uv={formUV === "moi" ? null : formUV}
          kqPV={kqPV}
          dong={() => setFormUV(null)}
          xong={() => {
            setFormUV(null);
            taiLai();
          }}
        />
      )}

      {formLH && (
        <FormLienHe
          uv={formLH.uv}
          lh={formLH.lh}
          kq={kqLienHe}
          dong={() => setFormLH(null)}
          xong={() => {
            setFormLH(null);
            taiLai();
          }}
        />
      )}
      {moImport && (
        <ImportUV
          dsHienCo={ds}
          dong={() => setMoImport(false)}
          xong={() => {
            setMoImport(false);
            taiLai();
          }}
        />
      )}

      {formPV && (
        <FormPhongVan
          uv={formPV.uv}
          pv={formPV.pv}
          kq={kqPV}
          goiY={goiYViTri}
          dong={() => setFormPV(null)}
          xong={() => {
            setFormPV(null);
            taiLai();
          }}
        />
      )}
    </div>
  );
}

function FormLienHe({
  uv,
  lh,
  kq,
  dong,
  xong,
}: {
  uv: UngVien;
  lh: LienHe | null;
  kq: string[];
  dong: () => void;
  xong: () => void;
}) {
  const [ngay, setNgay] = useState(toInputDT(lh?.ngay ?? null));
  const [ketQua, setKetQua] = useState(
    lh?.ket_qua ?? kq.find((x) => x !== CHUA_LIEN_HE) ?? kq[0] ?? ""
  );
  const [noiDung, setNoiDung] = useState(lh?.noi_dung ?? "");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    const du = {
      ung_vien_id: uv.id,
      ngay: fromInputDT(ngay),
      ket_qua: ketQua,
      noi_dung: noiDung.trim() || null,
    };
    const { error } = lh
      ? await supabase.from("lien_he").update(du).eq("id", lh.id)
      : await supabase.from("lien_he").insert(du);
    setDang(false);
    if (error) {
      setLoi(thongBaoLoi(error.message));
      return;
    }
    xong();
  }

  return (
    <Modal
      tieuDe={(lh ? "Sửa" : "Thêm") + " lần liên hệ — " + uv.ho_ten}
      dong={dong}
    >
      <form onSubmit={gui} className="space-y-3">
        <div>
          <label className={nhan}>Thời gian liên hệ</label>
          <input
            className={o}
            type="datetime-local"
            value={ngay}
            onChange={(e) => setNgay(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={nhan}>Kết quả liên hệ</label>
          <select className={o} value={ketQua} onChange={(e) => setKetQua(e.target.value)}>
            {kq.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={nhan}>Ghi chú (không bắt buộc)</label>
          <input
            className={o}
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            placeholder="Ví dụ: hẹn gọi lại chiều mai"
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

function FormPhongVan({
  uv,
  pv,
  kq,
  goiY,
  dong,
  xong,
}: {
  uv: UngVien;
  pv: PhongVan | null;
  kq: string[];
  goiY: string[];
  dong: () => void;
  xong: () => void;
}) {
  const [ngay, setNgay] = useState(toInputDT(pv?.ngay ?? null));
  const [hinhThuc, setHinhThuc] = useState(pv?.hinh_thuc ?? "Trực tiếp");
  const [viTri, setViTri] = useState(pv?.vi_tri ?? "");
  const [ketQua, setKetQua] = useState(pv?.ket_qua ?? "");
  const [ghiChu, setGhiChu] = useState(pv?.nhan_xet ?? "");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    const du = {
      ung_vien_id: uv.id,
      ngay: fromInputDT(ngay),
      hinh_thuc: hinhThuc,
      vi_tri: viTri.trim() || null,
      ket_qua: ketQua || null,
      nhan_xet: ghiChu.trim() || null,
    };
    const { error } = pv
      ? await supabase.from("phong_van").update(du).eq("id", pv.id)
      : await supabase.from("phong_van").insert(du);
    setDang(false);
    if (error) {
      setLoi(thongBaoLoi(error.message));
      return;
    }
    xong();
  }

  return (
    <Modal
      tieuDe={(pv ? "Sửa" : "Thêm") + " lần phỏng vấn — " + uv.ho_ten}
      dong={dong}
    >
      <form onSubmit={gui} className="space-y-3">
        <div>
          <label className={nhan}>Ngày giờ phỏng vấn</label>
          <input
            className={o}
            type="datetime-local"
            value={ngay}
            onChange={(e) => setNgay(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={nhan}>Hình thức phỏng vấn</label>
          <select className={o} value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value)}>
            {HINH_THUC_PV.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={nhan}>Vị trí phỏng vấn</label>
          <input
            className={o}
            list="gy-vi-tri-pv"
            value={viTri}
            onChange={(e) => setViTri(e.target.value)}
            placeholder="Ví dụ: Công nhân vận hành"
          />
          <datalist id="gy-vi-tri-pv">
            {goiY.map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={nhan}>Kết quả phỏng vấn lần này</label>
          <select className={o} value={ketQua} onChange={(e) => setKetQua(e.target.value)}>
            <option value="">— Chưa có kết quả —</option>
            {kq.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={nhan}>Ghi chú lý do (không bắt buộc)</label>
          <textarea
            className={o}
            rows={2}
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Ví dụ: Ứng viên chưa đáp ứng kinh nghiệm, hẹn phỏng vấn lại"
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
