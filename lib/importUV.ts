import { LDPT, TRINH_DO } from "./kieu";
import type { HangExcel, OExcel } from "./docExcel";

// Một hồ sơ đã kiểm tra xong, sẵn sàng ghi vào cơ sở dữ liệu
export type UVNhap = {
  ngay_ung_tuyen: string;
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
};

export type PhanTich = {
  hopLe: { so: number; uv: UVNhap }[];
  loi: { so: number; viec: string }[];
  tongHang: number;
};

type Truong = keyof UVNhap;

// Tên cột chấp nhận (đã bỏ dấu, viết thường) để đọc được cả file không đúng mẫu
const TEN_COT: Record<Truong, string[]> = {
  ngay_ung_tuyen: ["thoi gian ung tuyen", "ngay ung tuyen", "thoi gian", "ngay nop ho so", "ngay nop"],
  ho_ten: ["ho ten", "ho va ten", "ho ten ung vien", "ten ung vien", "ten"],
  ngay_sinh: ["ngay sinh", "ngay thang nam sinh", "sinh nhat"],
  dia_chi: ["dia chi", "dia chi thuong tru", "noi o", "noi o hien nay"],
  sdt: ["so dien thoai", "dien thoai", "sdt", "so dt", "phone", "so dien thoai lien he"],
  trinh_do: ["trinh do chuyen mon", "trinh do", "bang cap"],
  chuyen_nganh: ["chuyen nganh", "nganh hoc", "nganh"],
  truong: ["truong hoc", "truong", "truong dao tao", "noi dao tao"],
  nam_tot_nghiep: ["nam tot nghiep", "nam tn", "tot nghiep"],
  xep_loai: ["xep loai tot nghiep", "xep loai", "loai tot nghiep"],
  hoc_van: ["trinh do hoc van ldpt", "trinh do hoc van", "hoc van", "trinh do van hoa", "van hoa"],
  kinh_nghiem: ["kinh nghiem lam viec", "kinh nghiem", "qua trinh lam viec", "qua trinh cong tac"],
};

export function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TRINH_DO_KHAC: Record<string, string> = {
  "thac sy": "Thạc sĩ",
  ths: "Thạc sĩ",
  master: "Thạc sĩ",
  dh: "Đại học",
  "cu nhan": "Đại học",
  "ky su": "Đại học",
  cd: "Cao đẳng",
  tc: "Trung cấp",
  "trung cap nghe": "Trung cấp",
  "so cap nghe": "Sơ cấp",
  ldpt: LDPT,
  "pho thong": LDPT,
  thpt: LDPT,
  thcs: LDPT,
};

function timTrinhDo(raw: string): string | null {
  const k = boDau(raw);
  for (const t of TRINH_DO) if (boDau(t) === k) return t;
  return TRINH_DO_KHAC[k] ?? null;
}

const p2 = (n: number) => String(n).padStart(2, "0");

function chuoi(v: OExcel | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return "";
  return `${p2(v.getUTCDate())}/${p2(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`;
}

type Moc = { nam: number; thang: number; ngay: number; gio: number; phut: number };

function hopLeNgay(nam: number, thang: number, ngay: number): boolean {
  if (nam < 1900 || nam > 2200 || thang < 1 || thang > 12 || ngay < 1) return false;
  return ngay <= new Date(nam, thang, 0).getDate();
}

// Trả về null nếu để trống, "loi" nếu không hiểu được
function docNgay(v: OExcel | undefined): Moc | null | "loi" {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    return {
      nam: v.getUTCFullYear(),
      thang: v.getUTCMonth() + 1,
      ngay: v.getUTCDate(),
      gio: v.getUTCHours(),
      phut: v.getUTCMinutes(),
    };
  }
  if (typeof v !== "string") return "loi";
  const s = v.trim();
  if (!s) return null;
  let m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})(?!\d)(?:[ T]+(\d{1,2}):(\d{2}))?/.exec(s);
  let nam: number, thang: number, ngay: number, gio: number, phut: number;
  if (m) {
    ngay = parseInt(m[1], 10);
    thang = parseInt(m[2], 10);
    nam = parseInt(m[3], 10);
    if (m[3].length === 2) nam += nam > 49 ? 1900 : 2000;
    gio = m[4] ? parseInt(m[4], 10) : 0;
    phut = m[5] ? parseInt(m[5], 10) : 0;
  } else {
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{2}))?/.exec(s);
    if (!m) return "loi";
    nam = parseInt(m[1], 10);
    thang = parseInt(m[2], 10);
    ngay = parseInt(m[3], 10);
    gio = m[4] ? parseInt(m[4], 10) : 0;
    phut = m[5] ? parseInt(m[5], 10) : 0;
  }
  if (!hopLeNgay(nam, thang, ngay) || gio > 23 || phut > 59) return "loi";
  return { nam, thang, ngay, gio, phut };
}

function docSDT(v: OExcel | undefined): string {
  if (typeof v === "number") {
    let s = String(Math.round(v));
    if (s.length === 9) s = "0" + s; // Excel làm mất số 0 đầu
    return s;
  }
  return chuoi(v);
}

// Dùng để so trùng số điện thoại
export function chuanSDT(s: string | null | undefined): string {
  let d = (s ?? "").replace(/\D/g, "");
  if (d.startsWith("84") && d.length === 11) d = "0" + d.slice(2);
  return d;
}

export function phanTichHang(hang: HangExcel[], mocBay: Date = new Date()): PhanTich {
  // 1. Tìm dòng tiêu đề (dòng có cột Họ tên) trong 15 dòng đầu
  let dongTD = -1;
  const cot: Partial<Record<Truong, number>> = {};
  for (let i = 0; i < hang.length && i < 15; i++) {
    const tam: Partial<Record<Truong, number>> = {};
    hang[i].o.forEach((v, j) => {
      const k = boDau(chuoi(v));
      if (!k) return;
      for (const t of Object.keys(TEN_COT) as Truong[]) {
        if (tam[t] === undefined && TEN_COT[t].includes(k)) {
          tam[t] = j;
          break;
        }
      }
    });
    if (tam.ho_ten !== undefined) {
      dongTD = i;
      Object.assign(cot, tam);
      break;
    }
  }
  if (dongTD < 0) {
    throw new Error(
      'Không tìm thấy cột "Họ tên" trong file. Hãy dùng file Excel mẫu (nút "Tải file Excel mẫu") và giữ nguyên dòng tiêu đề.'
    );
  }

  const lay = (h: HangExcel, t: Truong): OExcel | undefined =>
    cot[t] === undefined ? undefined : h.o[cot[t] as number];

  const hopLe: PhanTich["hopLe"] = [];
  const loi: PhanTich["loi"] = [];
  const dong = hang.slice(dongTD + 1);

  for (const h of dong) {
    const viec: string[] = [];
    const hoTen = chuoi(lay(h, "ho_ten"));
    if (!hoTen) viec.push("thiếu họ tên");

    const ns = docNgay(lay(h, "ngay_sinh"));
    if (ns === "loi") viec.push("ngày sinh không đúng định dạng (cần dd/mm/yyyy)");
    const nut = docNgay(lay(h, "ngay_ung_tuyen"));
    if (nut === "loi") viec.push("thời gian ứng tuyển không đúng định dạng (cần dd/mm/yyyy hoặc dd/mm/yyyy hh:mm)");

    const tdRaw = chuoi(lay(h, "trinh_do"));
    let td: string | null = null;
    if (tdRaw) {
      td = timTrinhDo(tdRaw);
      if (!td) viec.push(`trình độ "${tdRaw}" không nằm trong danh sách (${TRINH_DO.join(", ")})`);
    }
    const chuyenNganh = chuoi(lay(h, "chuyen_nganh"));
    const truong = chuoi(lay(h, "truong"));
    const nam = chuoi(lay(h, "nam_tot_nghiep"));
    const xepLoai = chuoi(lay(h, "xep_loai"));
    if (!tdRaw && (chuyenNganh || truong || nam || xepLoai)) {
      viec.push("có chuyên ngành/trường/năm tốt nghiệp nhưng thiếu Trình độ chuyên môn");
    }

    if (viec.length > 0) {
      loi.push({ so: h.so, viec: viec.join("; ") });
      continue;
    }

    const ldpt = td === LDPT;
    const coMon = td !== null && !ldpt;
    let ngayUT: string;
    if (nut && nut !== "loi") {
      ngayUT = new Date(nut.nam, nut.thang - 1, nut.ngay, nut.gio, nut.phut).toISOString();
    } else {
      ngayUT = mocBay.toISOString();
    }
    const ngaySinh =
      ns && ns !== "loi" ? `${ns.nam}-${p2(ns.thang)}-${p2(ns.ngay)}` : null;

    hopLe.push({
      so: h.so,
      uv: {
        ngay_ung_tuyen: ngayUT,
        ho_ten: hoTen,
        ngay_sinh: ngaySinh,
        dia_chi: chuoi(lay(h, "dia_chi")) || null,
        sdt: docSDT(lay(h, "sdt")) || null,
        trinh_do: td,
        chuyen_nganh: coMon ? chuyenNganh || null : null,
        truong: coMon ? truong || null : null,
        nam_tot_nghiep: coMon ? nam || null : null,
        xep_loai: coMon ? xepLoai || null : null,
        hoc_van: ldpt ? chuoi(lay(h, "hoc_van")) || null : null,
        kinh_nghiem: chuoi(lay(h, "kinh_nghiem")) || null,
      },
    });
  }
  return { hopLe, loi, tongHang: dong.length };
}
