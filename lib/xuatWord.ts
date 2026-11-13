import JSZip from "jszip";
import { LDPT, fmtNgay, type DeXuat, type UngVien } from "./kieu";

export type AnhThe = { base64: string; rong: number; cao: number };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Chuỗi nhiều dòng -> nhiều dòng trong Word
function dongXml(v: string): string {
  return v
    .split(/\r?\n/)
    .map(esc)
    .join('</w:t><w:br/><w:t xml:space="preserve">');
}

// Ô ảnh thẻ trong file mẫu rộng khoảng 2,6 cm x 3,4 cm
const KHUNG_RONG = 936000; // EMU
const KHUNG_CAO = 1224000;

function xmlAnh(a: AnhThe): string {
  const ti = Math.min(KHUNG_RONG / a.rong, KHUNG_CAO / a.cao);
  const cx = Math.round(a.rong * ti);
  const cy = Math.round(a.cao * ti);
  return (
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="9001" name="Anh the"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="anh_the.jpg"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rIdAnhThe"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

// Điền dữ liệu vào file mẫu (dạng byte) và trả về file Word mới
export async function taoFileWord(
  mau: ArrayBuffer | Uint8Array,
  du: Record<string, string>,
  anh: AnhThe | null
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(mau);
  const f = zip.file("word/document.xml");
  if (!f) throw new Error("File mẫu Word không hợp lệ");
  let xml = await f.async("string");

  // 1. Ảnh thẻ
  const oAnh = '<w:r><w:t xml:space="preserve">[[ANH]]</w:t></w:r>';
  if (anh) {
    xml = xml.split(oAnh).join(xmlAnh(anh));
    zip.file("word/media/anh_the.jpg", anh.base64, {
      base64: true,
      createFolders: false,
    });

    const relF = zip.file("word/_rels/document.xml.rels");
    if (!relF) throw new Error("File mẫu Word thiếu document.xml.rels");
    const rel = await relF.async("string");
    zip.file(
      "word/_rels/document.xml.rels",
      rel.replace(
        "</Relationships>",
        '<Relationship Id="rIdAnhThe" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/anh_the.jpg"/></Relationships>'
      ),
      { createFolders: false }
    );

    const ctF = zip.file("[Content_Types].xml");
    if (!ctF) throw new Error("File mẫu Word thiếu [Content_Types].xml");
    const ct = await ctF.async("string");
    if (!/Extension="jpg"/i.test(ct)) {
      zip.file(
        "[Content_Types].xml",
        ct.replace(
          "</Types>",
          '<Default Extension="jpg" ContentType="image/jpeg"/></Types>'
        ),
        { createFolders: false }
      );
    }
  } else {
    xml = xml.split(oAnh).join('<w:r><w:t xml:space="preserve">Ảnh thẻ</w:t></w:r>');
  }

  // 2. Các ô chữ
  for (const [khoa, giaTri] of Object.entries(du)) {
    const o = `<w:t xml:space="preserve">[[${khoa}]]</w:t>`;
    xml = xml.split(o).join(`<w:t xml:space="preserve">${dongXml(giaTri)}</w:t>`);
  }
  // Ô nào chưa có dữ liệu thì để trống
  xml = xml.replace(/\[\[[A-Z_0-9]+\]\]/g, "");

  zip.file("word/document.xml", xml, { createFolders: false });
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

const ghep = (a: (string | null | undefined)[], noi: string) =>
  a.filter((x) => x && x.trim()).join(noi);

// Gom dữ liệu ứng viên + đề xuất thành các ô của file mẫu
export function duLieuWord(
  uv: UngVien,
  dx: Omit<DeXuat, "id" | "ung_vien_id">
): Record<string, string> {
  const b = dx.bo_sung ?? {};
  return {
    DON_VI: dx.don_vi ?? "",
    PHONG_BAN: dx.phong_ban ?? "",
    VI_TRI: dx.vi_tri ?? "",
    HO_TEN_HOA: uv.ho_ten.toUpperCase(),
    GIOI_TINH: b.gioi_tinh ?? "",
    NGAY_SINH: fmtNgay(uv.ngay_sinh),
    NOI_SINH: b.noi_sinh ?? "",
    QUE_QUAN: b.que_quan ?? "",
    CCCD_SO: b.cccd_so ?? "",
    CCCD_NGAY: b.cccd_ngay ?? "",
    CCCD_NOI: b.cccd_noi ?? "",
    HKTT: uv.dia_chi ?? "",
    GIA_DINH: b.gia_dinh ?? "",
    SO_CON: b.so_con ?? "",
    DIEN_THOAI: uv.sdt ?? "",
    CHIEU_CAO: b.chieu_cao ?? "",
    CAN_NANG: b.can_nang ?? "",
    CHUYEN_MON: ghep([uv.trinh_do, uv.chuyen_nganh], " - "),
    HOC_VAN:
      uv.trinh_do === LDPT
        ? uv.hoc_van ?? ""
        : ghep([uv.truong, uv.nam_tot_nghiep, uv.xep_loai], " - "),
    QUA_TRINH: uv.kinh_nghiem ?? "",
    UU_DIEM: dx.uu_diem ?? "",
    HAN_CHE: dx.han_che ?? "",
    MUC_LUONG: dx.muc_luong ?? "",
    DON_VI_TINH: dx.don_vi_tinh ?? "",
    NGUOI_PV_1: b.nguoi_pv_1 ?? "",
    NGUOI_PV_2: b.nguoi_pv_2 ?? "",
    NOI_O: b.noi_o ?? "",
    NOI_LAM_VIEC: b.noi_lam_viec ?? "",
    NGUOI_DE_XUAT: dx.nguoi_de_xuat ?? "",
  };
}

function kichThuocAnh(dataUrl: string): Promise<{ rong: number; cao: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ rong: img.naturalWidth, cao: img.naturalHeight });
    img.onerror = () => reject(new Error("Không đọc được ảnh thẻ"));
    img.src = dataUrl;
  });
}

function tenKhongDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Dùng trong trình duyệt: tải file mẫu và điền dữ liệu, trả về nội dung file Word
export async function taoPhieuDeXuat(
  uv: UngVien,
  dx: Omit<DeXuat, "id" | "ung_vien_id">
): Promise<{ bytes: Uint8Array; tenFile: string }> {
  const res = await fetch("/mau/DXTD-mau.docx");
  if (!res.ok) {
    throw new Error("Không tải được file mẫu Word (public/mau/DXTD-mau.docx)");
  }
  const mau = await res.arrayBuffer();

  let anh: AnhThe | null = null;
  const m = dx.anh_the ? /^data:image\/\w+;base64,(.+)$/.exec(dx.anh_the) : null;
  if (dx.anh_the && m) {
    const kt = await kichThuocAnh(dx.anh_the);
    anh = { base64: m[1], rong: kt.rong, cao: kt.cao };
  }

  const bytes = await taoFileWord(mau, duLieuWord(uv, dx), anh);
  const tenFile = `DXTD_${uv.ma_uv ?? "UV"}_${tenKhongDau(uv.ho_ten)}.docx`;
  return { bytes, tenFile };
}

// Tải file Word về máy
export function taiFileVeMay(bytes: Uint8Array, tenFile: string): void {
  const blob = new Blob([bytes as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = tenFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function xuatPhieuDeXuat(
  uv: UngVien,
  dx: Omit<DeXuat, "id" | "ung_vien_id">
): Promise<void> {
  const { bytes, tenFile } = await taoPhieuDeXuat(uv, dx);
  taiFileVeMay(bytes, tenFile);
}
