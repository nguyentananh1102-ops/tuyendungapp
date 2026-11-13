"use client";

import { LDPT, TRINH_DO, type UngVien, fromInputDT, toInputDT } from "@/lib/kieu";
import { nhan, o } from "@/lib/ui";

// Dữ liệu trên form (toàn bộ là chuỗi để dễ nhập)
export type FormUV = {
  ngay_ung_tuyen: string;
  ho_ten: string;
  ngay_sinh: string;
  dia_chi: string;
  sdt: string;
  trinh_do: string;
  chuyen_nganh: string;
  truong: string;
  nam_tot_nghiep: string;
  xep_loai: string;
  hoc_van: string;
  kinh_nghiem: string;
  ket_qua_pv: string;
};

export function formTuUV(u: UngVien | null): FormUV {
  return {
    ngay_ung_tuyen: toInputDT(u?.ngay_ung_tuyen ?? null),
    ho_ten: u?.ho_ten ?? "",
    ngay_sinh: u?.ngay_sinh ?? "",
    dia_chi: u?.dia_chi ?? "",
    sdt: u?.sdt ?? "",
    trinh_do: u?.trinh_do ?? "",
    chuyen_nganh: u?.chuyen_nganh ?? "",
    truong: u?.truong ?? "",
    nam_tot_nghiep: u?.nam_tot_nghiep ?? "",
    xep_loai: u?.xep_loai ?? "",
    hoc_van: u?.hoc_van ?? "",
    kinh_nghiem: u?.kinh_nghiem ?? "",
    ket_qua_pv: u?.ket_qua_pv ?? "",
  };
}

// Chuyển dữ liệu form thành dữ liệu lưu vào Supabase
export function payloadTuForm(f: FormUV) {
  const ldpt = f.trinh_do === LDPT;
  const coMon = f.trinh_do !== "" && !ldpt;
  return {
    ngay_ung_tuyen: fromInputDT(f.ngay_ung_tuyen),
    ho_ten: f.ho_ten.trim(),
    ngay_sinh: f.ngay_sinh || null,
    dia_chi: f.dia_chi.trim() || null,
    sdt: f.sdt.trim() || null,
    trinh_do: f.trinh_do || null,
    hoc_van: ldpt ? f.hoc_van.trim() || null : null,
    chuyen_nganh: coMon ? f.chuyen_nganh.trim() || null : null,
    truong: coMon ? f.truong.trim() || null : null,
    nam_tot_nghiep: coMon ? f.nam_tot_nghiep.trim() || null : null,
    xep_loai: coMon ? f.xep_loai.trim() || null : null,
    kinh_nghiem: f.kinh_nghiem.trim() || null,
    ket_qua_pv: f.ket_qua_pv || null,
  };
}

type Thay = React.ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;

export default function TruongUV({
  f,
  set,
  kqPV,
  hienKQPV = true,
}: {
  f: FormUV;
  set: (f: FormUV) => void;
  kqPV: string[];
  hienKQPV?: boolean;
}) {
  const c = (k: keyof FormUV) => (e: Thay) => set({ ...f, [k]: e.target.value });
  const ldpt = f.trinh_do === LDPT;
  const coMon = f.trinh_do !== "" && !ldpt;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className={nhan}>Thời gian ứng tuyển</label>
        <input
          className={o}
          type="datetime-local"
          value={f.ngay_ung_tuyen}
          onChange={c("ngay_ung_tuyen")}
          required
        />
      </div>
      <div>
        <label className={nhan}>Họ tên *</label>
        <input className={o} value={f.ho_ten} onChange={c("ho_ten")} required />
      </div>
      <div>
        <label className={nhan}>Ngày sinh</label>
        <input className={o} type="date" value={f.ngay_sinh} onChange={c("ngay_sinh")} />
      </div>
      <div>
        <label className={nhan}>Số điện thoại</label>
        <input className={o} value={f.sdt} onChange={c("sdt")} />
      </div>
      <div className="sm:col-span-2">
        <label className={nhan}>Địa chỉ</label>
        <input className={o} value={f.dia_chi} onChange={c("dia_chi")} />
      </div>

      <div className="sm:col-span-2">
        <label className={nhan}>Trình độ chuyên môn</label>
        <select className={o} value={f.trinh_do} onChange={c("trinh_do")}>
          <option value="">— Chọn —</option>
          {TRINH_DO.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {ldpt && (
        <div className="sm:col-span-2">
          <label className={nhan}>Trình độ học vấn (ví dụ: 10/12)</label>
          <input className={o} value={f.hoc_van} onChange={c("hoc_van")} placeholder="10/12" />
        </div>
      )}

      {coMon && (
        <>
          <div>
            <label className={nhan}>Chuyên ngành</label>
            <input className={o} value={f.chuyen_nganh} onChange={c("chuyen_nganh")} />
          </div>
          <div>
            <label className={nhan}>Trường học</label>
            <input className={o} value={f.truong} onChange={c("truong")} />
          </div>
          <div>
            <label className={nhan}>Năm tốt nghiệp</label>
            <input className={o} value={f.nam_tot_nghiep} onChange={c("nam_tot_nghiep")} placeholder="2023" />
          </div>
          <div>
            <label className={nhan}>Xếp loại tốt nghiệp</label>
            <input
              className={o}
              list="ds-xep-loai"
              value={f.xep_loai}
              onChange={c("xep_loai")}
              placeholder="Khá"
            />
            <datalist id="ds-xep-loai">
              <option value="Xuất sắc" />
              <option value="Giỏi" />
              <option value="Khá" />
              <option value="Trung bình khá" />
              <option value="Trung bình" />
            </datalist>
          </div>
        </>
      )}

      <div className="sm:col-span-2">
        <label className={nhan}>Kinh nghiệm làm việc</label>
        <textarea
          className={o}
          rows={3}
          value={f.kinh_nghiem}
          onChange={c("kinh_nghiem")}
          placeholder="Ví dụ: 2019-2021: Công nhân tại Công ty X"
        />
      </div>

      {hienKQPV && (
        <div className="sm:col-span-2">
          <label className={nhan}>Kết quả phỏng vấn</label>
          <select className={o} value={f.ket_qua_pv} onChange={c("ket_qua_pv")}>
            <option value="">— Chưa có kết quả —</option>
            {kqPV.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
