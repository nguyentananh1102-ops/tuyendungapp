"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import {
  CHUA_LIEN_HE,
  TRINH_DO,
  type LienHe,
  type UngVien,
  fmtNgayGio,
  ketQuaLienHeMoiNhat,
  ngayLocal,
} from "@/lib/kieu";
import { nhan, nutNho, o } from "@/lib/ui";

type DX = { ung_vien_id: string; phong_ban: string | null; don_vi: string | null };
type Diem = { ten: string; so: number };

const p2 = (n: number) => String(n).padStart(2, "0");
const khoaNgay = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

// Đếm số ứng viên theo ngày (nếu khoảng thời gian <= 45 ngày) hoặc theo tháng
function nhomThoiGian(ds: UngVien[], tu: string, den: string): Diem[] {
  const ngays = ds
    .map((u) => ngayLocal(u.ngay_ung_tuyen))
    .filter(Boolean)
    .sort();
  if (ngays.length === 0) return [];
  const a = tu || ngays[0];
  const b = den || ngays[ngays.length - 1];
  const dA = new Date(a + "T00:00:00");
  const dB = new Date(b + "T00:00:00");
  const soNgay = (dB.getTime() - dA.getTime()) / 86400000;

  const dem = new Map<string, number>();
  if (soNgay <= 45) {
    for (const t = new Date(dA); t.getTime() <= dB.getTime(); t.setDate(t.getDate() + 1)) {
      dem.set(khoaNgay(t), 0);
    }
    for (const n of ngays) if (dem.has(n)) dem.set(n, (dem.get(n) ?? 0) + 1);
    return Array.from(dem.entries()).map(([k, v]) => ({
      ten: `${k.slice(8, 10)}/${k.slice(5, 7)}`,
      so: v,
    }));
  }
  for (const n of ngays) {
    const k = n.slice(0, 7);
    dem.set(k, (dem.get(k) ?? 0) + 1);
  }
  return Array.from(dem.entries())
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .map(([k, v]) => ({ ten: `${k.slice(5, 7)}/${k.slice(0, 4)}`, so: v }));
}

function demTheo(ds: (string | null)[]): Diem[] {
  const m = new Map<string, number>();
  for (const x of ds) {
    const k = x && x.trim() ? x.trim() : "Chưa ghi";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([ten, so]) => ({ ten, so }));
}

function The({ ten, so }: { ten: string; so: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-sm text-gray-600">{ten}</p>
      <p className="text-3xl font-bold text-green-800">{so}</p>
    </div>
  );
}

export default function TrangDashboard() {
  const [ds, setDs] = useState<UngVien[]>([]);
  const [lh, setLh] = useState<LienHe[]>([]);
  const [dx, setDx] = useState<DX[]>([]);
  const [loi, setLoi] = useState("");
  const [tu, setTu] = useState("");
  const [den, setDen] = useState("");
  const [nhom, setNhom] = useState<"don_vi" | "phong_ban">("don_vi");

  useEffect(() => {
    (async () => {
      const [a, b, c] = await Promise.all([
        supabase.from("ung_vien").select("*"),
        supabase.from("lien_he").select("*"),
        supabase.from("de_xuat").select("ung_vien_id, phong_ban, don_vi"),
      ]);
      const e = a.error ?? b.error ?? c.error;
      if (e) {
        setLoi(e.message);
        return;
      }
      setDs((a.data ?? []) as UngVien[]);
      setLh((b.data ?? []) as LienHe[]);
      setDx((c.data ?? []) as DX[]);
    })();
  }, []);

  const trongKy = useMemo(
    () =>
      ds.filter((u) => {
        const n = ngayLocal(u.ngay_ung_tuyen);
        return (!tu || n >= tu) && (!den || n <= den);
      }),
    [ds, tu, den]
  );

  const daTuyen = useMemo(() => {
    const id = new Set(trongKy.map((u) => u.id));
    return dx.filter((x) => id.has(x.ung_vien_id));
  }, [trongKy, dx]);

  const bieuDoDaTuyen = useMemo(
    () => demTheo(daTuyen.map((x) => (nhom === "don_vi" ? x.don_vi : x.phong_ban))),
    [daTuyen, nhom]
  );
  const bieuDoUngTuyen = useMemo(() => nhomThoiGian(trongKy, tu, den), [trongKy, tu, den]);
  const bieuDoTrinhDo = useMemo(() => {
    const dem = TRINH_DO.map((t) => ({
      ten: t,
      so: trongKy.filter((u) => u.trinh_do === t).length,
    }));
    const chua = trongKy.filter((u) => !u.trinh_do).length;
    return chua > 0 ? [...dem, { ten: "Chưa nhập", so: chua }] : dem;
  }, [trongKy]);

  // Cảnh báo: ứng tuyển quá 3 ngày, chưa liên hệ và chưa có kết quả phỏng vấn
  const canhBao = useMemo(() => {
    const theoUV = new Map<string, LienHe[]>();
    for (const x of lh) {
      const a = theoUV.get(x.ung_vien_id) ?? [];
      a.push(x);
      theoUV.set(x.ung_vien_id, a);
    }
    const bay = Date.now();
    return ds
      .map((u) => ({
        u,
        ngay: u.ngay_ung_tuyen ? bay - new Date(u.ngay_ung_tuyen).getTime() : 0,
      }))
      .filter(
        ({ u, ngay }) =>
          ngay > 3 * 86400000 &&
          !u.ket_qua_pv &&
          ketQuaLienHeMoiNhat(theoUV.get(u.id) ?? []) === CHUA_LIEN_HE
      )
      .sort((a, b) => b.ngay - a.ngay);
  }, [ds, lh]);

  const soDat = trongKy.filter((u) => u.ket_qua_pv === "Đạt phỏng vấn").length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">III. DASHBOARD</h1>

      <div className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow sm:grid-cols-3">
        <div>
          <label className={nhan}>Từ ngày</label>
          <input className={o} type="date" value={tu} onChange={(e) => setTu(e.target.value)} />
        </div>
        <div>
          <label className={nhan}>Đến ngày</label>
          <input className={o} type="date" value={den} onChange={(e) => setDen(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button
            className={nutNho}
            onClick={() => {
              setTu("");
              setDen("");
            }}
          >
            Xem tất cả thời gian
          </button>
        </div>
      </div>

      {loi && <p className="text-sm text-red-600">{loi}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <The ten="Ứng viên đã ứng tuyển" so={trongKy.length} />
        <The ten="Đạt phỏng vấn" so={soDat} />
        <The ten="Đã lập đề xuất tuyển dụng" so={daTuyen.length} />
      </div>

      {/* 1. Đã tuyển theo phòng ban / đơn vị */}
      <section className="rounded-xl bg-white p-4 shadow">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">1. Ứng viên đã tuyển (đã lập đề xuất)</h2>
          <select
            className={o + " sm:w-56"}
            value={nhom}
            onChange={(e) => setNhom(e.target.value as "don_vi" | "phong_ban")}
          >
            <option value="don_vi">Theo Đơn vị / Xí nghiệp</option>
            <option value="phong_ban">Theo Phòng ban</option>
          </select>
        </div>
        {bieuDoDaTuyen.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Chưa có dữ liệu.</p>
        ) : (
          <div style={{ height: Math.max(220, bieuDoDaTuyen.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bieuDoDaTuyen} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="ten" width={150} />
                <Tooltip />
                <Bar dataKey="so" name="Số người" fill="#15803d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* 2. Ứng viên đã ứng tuyển */}
      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 font-semibold">2. Ứng viên đã ứng tuyển theo thời gian</h2>
        {bieuDoUngTuyen.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Chưa có dữ liệu.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bieuDoUngTuyen}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ten" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="so" name="Số ứng viên" fill="#0369a1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* 3. Trình độ chuyên môn */}
      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 font-semibold">3. Phân loại theo trình độ chuyên môn</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bieuDoTrinhDo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ten" interval={0} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="so" name="Số ứng viên" fill="#b45309" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4. Cảnh báo */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="mb-1 font-semibold text-red-800">
          4. Cảnh báo: ứng tuyển trên 3 ngày nhưng chưa liên hệ ({canhBao.length})
        </h2>
        <p className="mb-3 text-xs text-red-700">
          Mục này luôn tính trên toàn bộ hồ sơ, không phụ thuộc bộ lọc ngày ở trên.
        </p>
        {canhBao.length === 0 ? (
          <p className="text-sm text-gray-700">Không có hồ sơ nào bị chậm liên hệ.</p>
        ) : (
          <ul className="space-y-2">
            {canhBao.map(({ u, ngay }) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
              >
                <span>
                  <span className="mr-2 font-mono text-xs text-gray-500">{u.ma_uv}</span>
                  <b>{u.ho_ten}</b>
                  {u.sdt ? " — " + u.sdt : ""}
                </span>
                <span className="text-red-700">
                  Ứng tuyển {fmtNgayGio(u.ngay_ung_tuyen)} (chờ {Math.floor(ngay / 86400000)} ngày)
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/ung-vien" className="mt-3 inline-block text-sm text-green-800 underline">
          Mở danh sách ứng viên để liên hệ
        </Link>
      </section>
    </div>
  );
}
