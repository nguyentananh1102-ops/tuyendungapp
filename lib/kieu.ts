// Kiểu dữ liệu, danh mục cố định và các hàm định dạng dùng chung

export type UngVien = {
  id: string;
  ma_uv: string | null;
  ngay_ung_tuyen: string | null;
  ho_ten: string;
  ngay_sinh: string | null;
  dia_chi: string | null;
  sdt: string | null;
  trinh_do: string | null;
  chuyen_nganh: string | null;
  truong: string | null;
  nam_tot_nghiep: string | null;
  xep_loai: string | null;
  hoc_van: string | null;
  kinh_nghiem: string | null;
  ket_qua_pv: string | null;
};

export type PhongVan = {
  id: string;
  ung_vien_id: string;
  ngay: string | null;
  hinh_thuc: string | null;
  vi_tri: string | null;
  ket_qua: string | null;
  nhan_xet: string | null; // ghi chú lý do (không bắt buộc)
};

export type LienHe = {
  id: string;
  ung_vien_id: string;
  ngay: string;
  ket_qua: string | null;
  noi_dung: string | null;
};

// Các thông tin bổ sung (không bắt buộc) để điền vào phiếu đề xuất
export type BoSung = {
  gioi_tinh?: string;
  noi_sinh?: string;
  que_quan?: string;
  cccd_so?: string;
  cccd_ngay?: string;
  cccd_noi?: string;
  gia_dinh?: string;
  so_con?: string;
  chieu_cao?: string;
  can_nang?: string;
  noi_o?: string;
  noi_lam_viec?: string;
  nguoi_pv_1?: string;
  nguoi_pv_2?: string;
};

export type DeXuat = {
  id: string;
  ung_vien_id: string;
  vi_tri: string | null;
  phong_ban: string | null;
  don_vi: string | null;
  uu_diem: string | null;
  han_che: string | null;
  muc_luong: string | null;
  don_vi_tinh: string | null;
  anh_the: string | null;
  nguoi_de_xuat: string | null;
  bo_sung: BoSung | null;
  tinh_trang: string | null;
  ly_do_tra: string | null;
};

export const HINH_THUC_PV = ["Online", "Trực tiếp"];

export const TINH_TRANG_HS = ["Chưa trình", "Đã trình", "Bị trả hồ sơ"];
export const TRA_HO_SO = "Bị trả hồ sơ";

export const TRINH_DO = [
  "Thạc sĩ",
  "Đại học",
  "Cao đẳng",
  "Trung cấp",
  "Sơ cấp",
  "Lao động phổ thông",
];
export const LDPT = "Lao động phổ thông";

// Hai mục cố định mà chương trình dùng để tính toán, không cho đổi tên/xóa
export const CHUA_LIEN_HE = "Chưa liên hệ";
export const DAT_PV = "Đạt phỏng vấn";

export const KQ_LIEN_HE_MAC_DINH = [
  "Chưa liên hệ",
  "Không nghe máy",
  "Chưa trả lời tin nhắn",
  "Số liên hệ không đúng",
  "UV đã có việc làm",
  "UV thay đổi nhu cầu",
  "Đã kết nối Zalo",
];
export const KQ_PV_MAC_DINH = [
  "Đạt phỏng vấn",
  "Không đạt phỏng vấn",
  "Đang xem xét",
  "Ứng viên hủy nhu cầu",
];

const p2 = (n: number) => String(n).padStart(2, "0");

// "8:15 16/10/2026"
export function fmtNgayGio(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getHours()}:${p2(d.getMinutes())} ${p2(d.getDate())}/${p2(
    d.getMonth() + 1
  )}/${d.getFullYear()}`;
}

// "16/10/2026" (nhận chuỗi ngày dạng 2026-10-16 mà không bị lệch múi giờ)
export function fmtNgay(s?: string | null): string {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Chuyển giờ ISO sang chuỗi cho ô nhập datetime-local (giờ máy người dùng)
export function toInputDT(iso?: string | null): string {
  let d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(
    d.getHours()
  )}:${p2(d.getMinutes())}`;
}

export function fromInputDT(v: string): string {
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// Ngày (giờ máy người dùng) dạng 2026-10-16, dùng để so sánh bộ lọc
export function ngayLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function trinhDoHienThi(u: UngVien): string {
  if (!u.trinh_do) return "";
  const phan =
    u.trinh_do === LDPT
      ? [u.trinh_do, u.hoc_van]
      : [u.trinh_do, u.chuyen_nganh, u.truong, u.nam_tot_nghiep, u.xep_loai];
  return phan.filter(Boolean).join(" - ");
}

// Kết quả của lần liên hệ gần nhất; chưa có lần nào = "Chưa liên hệ"
export function ketQuaLienHeMoiNhat(ds: LienHe[]): string {
  if (ds.length === 0) return CHUA_LIEN_HE;
  let moi = ds[0];
  for (const x of ds) {
    if (new Date(x.ngay).getTime() > new Date(moi.ngay).getTime()) moi = x;
  }
  return moi.ket_qua || CHUA_LIEN_HE;
}

// Chuyển lỗi kỹ thuật của cơ sở dữ liệu thành lời nhắc dễ hiểu
export function thongBaoLoi(msg: string): string {
  if (/schema cache|Could not find the/i.test(msg)) {
    return (
      msg +
      " — Cơ sở dữ liệu chưa có cột này. Hãy thêm cột theo hướng dẫn (lệnh SQL alter table), đợi vài giây rồi tải lại trang (F5)."
    );
  }
  return msg;
}
