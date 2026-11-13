import JSZip from "jszip";
import type { DeXuat, UngVien } from "./kieu";

// Ô dữ liệu: chữ, hoặc ngày (YYYY-MM-DD), hoặc ngày giờ (chuỗi ISO), hoặc trống
export type Cell = string | null | undefined | { ngay: string } | { ngayGio: string };
export type CotExcel = { tieuDe: string; rong: number };

const esc = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // ký tự cấm trong XML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function tenCot(i: number): string {
  let s = "";
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

// Số ngày kiểu Excel (giờ lấy theo giờ trên máy người dùng)
function soExcel(y: number, m: number, d: number, h = 0, mi = 0): number {
  return Date.UTC(y, m - 1, d, h, mi) / 86400000 + 25569;
}

function oXml(c: Cell, ref: string): string {
  if (c === null || c === undefined || c === "") return "";
  if (typeof c === "string") {
    return `<c r="${ref}" s="4" t="inlineStr"><is><t xml:space="preserve">${esc(c)}</t></is></c>`;
  }
  if ("ngay" in c) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(c.ngay);
    if (!m) return "";
    return `<c r="${ref}" s="2"><v>${soExcel(+m[1], +m[2], +m[3])}</v></c>`;
  }
  const d = new Date(c.ngayGio);
  if (isNaN(d.getTime())) return "";
  return `<c r="${ref}" s="3"><v>${soExcel(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes()
  )}</v></c>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy\\ hh:mm"/></numFmts>
<fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF166534"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBBBBBB"/></left><right style="thin"><color rgb="FFBBBBBB"/></right><top style="thin"><color rgb="FFBBBBBB"/></top><bottom style="thin"><color rgb="FFBBBBBB"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// Tạo file .xlsx (1 sheet) ngay trong trình duyệt
export async function taoFileExcel(
  tenSheet: string,
  cot: CotExcel[],
  hang: Cell[][]
): Promise<Uint8Array> {
  const zip = new JSZip();
  const opt = { createFolders: false };
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    opt
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    opt
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(
      tenSheet
    )}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    opt
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    opt
  );
  zip.file("xl/styles.xml", STYLES, opt);

  const cuoi = tenCot(cot.length - 1);
  let rows = `<row r="1" ht="34" customHeight="1">`;
  cot.forEach((c, i) => {
    rows += `<c r="${tenCot(i)}1" s="1" t="inlineStr"><is><t xml:space="preserve">${esc(c.tieuDe)}</t></is></c>`;
  });
  rows += "</row>";
  hang.forEach((h, r) => {
    const so = r + 2;
    rows += `<row r="${so}">`;
    h.forEach((c, i) => {
      rows += oXml(c, tenCot(i) + so);
    });
    rows += "</row>";
  });
  const cols = cot
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.rong}" customWidth="1"/>`)
    .join("");
  const cuoiHang = hang.length + 1;
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${cuoi}${cuoiHang}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${cuoi}${cuoiHang}"/></worksheet>`,
    opt
  );
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function taiExcelVeMay(bytes: Uint8Array, tenFile: string): void {
  const blob = new Blob([bytes as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = tenFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---- Danh sách ứng viên ở mục II (đầy đủ các trường dữ liệu) ----
export const COT_DE_XUAT: CotExcel[] = [
  { tieuDe: "Mã UV", rong: 10 },
  { tieuDe: "Thời gian ứng tuyển", rong: 18 },
  { tieuDe: "Họ tên", rong: 24 },
  { tieuDe: "Giới tính", rong: 10 },
  { tieuDe: "Ngày sinh", rong: 12 },
  { tieuDe: "Số điện thoại", rong: 15 },
  { tieuDe: "Địa chỉ", rong: 34 },
  { tieuDe: "Trình độ chuyên môn", rong: 18 },
  { tieuDe: "Chuyên ngành", rong: 22 },
  { tieuDe: "Trường học", rong: 28 },
  { tieuDe: "Năm tốt nghiệp", rong: 12 },
  { tieuDe: "Xếp loại tốt nghiệp", rong: 14 },
  { tieuDe: "Trình độ học vấn (LĐPT)", rong: 14 },
  { tieuDe: "Kinh nghiệm làm việc", rong: 36 },
  { tieuDe: "Kết quả phỏng vấn", rong: 18 },
  { tieuDe: "Vị trí tuyển dụng", rong: 22 },
  { tieuDe: "Phòng ban", rong: 20 },
  { tieuDe: "Đơn vị / Xí nghiệp", rong: 22 },
  { tieuDe: "Nhận xét - Ưu điểm", rong: 30 },
  { tieuDe: "Nhận xét - Hạn chế", rong: 30 },
  { tieuDe: "Mức lương", rong: 14 },
  { tieuDe: "Đơn vị tính", rong: 10 },
  { tieuDe: "Tình trạng hồ sơ", rong: 16 },
  { tieuDe: "Lý do bị trả hồ sơ", rong: 30 },
  { tieuDe: "Người đề xuất (Giám đốc XN)", rong: 24 },
  { tieuDe: "Nơi sinh", rong: 20 },
  { tieuDe: "Quê quán", rong: 22 },
  { tieuDe: "Số CCCD / Hộ chiếu", rong: 18 },
  { tieuDe: "Ngày cấp", rong: 12 },
  { tieuDe: "Nơi cấp", rong: 20 },
  { tieuDe: "Tình trạng gia đình", rong: 16 },
  { tieuDe: "Số con", rong: 8 },
  { tieuDe: "Chiều cao (cm)", rong: 10 },
  { tieuDe: "Cân nặng (kg)", rong: 10 },
  { tieuDe: "Nơi ở hiện nay", rong: 28 },
  { tieuDe: "Nơi làm việc chính", rong: 24 },
  { tieuDe: "Người phỏng vấn 1", rong: 24 },
  { tieuDe: "Người phỏng vấn 2", rong: 24 },
  { tieuDe: "Có ảnh thẻ", rong: 10 },
];

export function hangDeXuat(u: UngVien, d: DeXuat | null): Cell[] {
  const b = d?.bo_sung ?? {};
  return [
    u.ma_uv,
    u.ngay_ung_tuyen ? { ngayGio: u.ngay_ung_tuyen } : null,
    u.ho_ten,
    b.gioi_tinh,
    u.ngay_sinh ? { ngay: u.ngay_sinh } : null,
    u.sdt,
    u.dia_chi,
    u.trinh_do,
    u.chuyen_nganh,
    u.truong,
    u.nam_tot_nghiep,
    u.xep_loai,
    u.hoc_van,
    u.kinh_nghiem,
    u.ket_qua_pv,
    d?.vi_tri,
    d?.phong_ban,
    d?.don_vi,
    d?.uu_diem,
    d?.han_che,
    d?.muc_luong,
    d?.don_vi_tinh,
    d ? d.tinh_trang ?? "Chưa trình" : "Chưa lập đề xuất",
    d?.ly_do_tra,
    d?.nguoi_de_xuat,
    b.noi_sinh,
    b.que_quan,
    b.cccd_so,
    b.cccd_ngay,
    b.cccd_noi,
    b.gia_dinh,
    b.so_con,
    b.chieu_cao,
    b.can_nang,
    b.noi_o,
    b.noi_lam_viec,
    b.nguoi_pv_1,
    b.nguoi_pv_2,
    d ? (d.anh_the ? "Có" : "Không") : null,
  ];
}

export async function taiDanhSachDeXuat(
  ds: { uv: UngVien; dx: DeXuat | null }[]
): Promise<void> {
  const bytes = await taoFileExcel(
    "DeXuatTuyenDung",
    COT_DE_XUAT,
    ds.map((x) => hangDeXuat(x.uv, x.dx))
  );
  const h = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  taiExcelVeMay(
    bytes,
    `DanhSach_DeXuatTuyenDung_${h.getFullYear()}${p2(h.getMonth() + 1)}${p2(h.getDate())}.xlsx`
  );
}
