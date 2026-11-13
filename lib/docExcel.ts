import JSZip from "jszip";

// Đọc file Excel (.xlsx) ngay trong trình duyệt, không cần thư viện ngoài.
// Chỉ đọc sheet hiển thị đầu tiên. Ô ngày giờ trả về kiểu Date (tính theo UTC).

export type OExcel = string | number | boolean | Date | null;
export type HangExcel = { so: number; o: OExcel[] }; // so = số dòng trong Excel

const ND = "(?:[A-Za-z0-9_]+:)?"; // tiền tố namespace XML (hiếm gặp)

function giaiMa(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
}

// Gộp mọi đoạn <t>...</t> (bỏ phần phiên âm) thành một chuỗi
function gomChu(xml: string): string {
  const sach = xml.replace(new RegExp(`<${ND}rPh\\b[\\s\\S]*?</${ND}rPh>`, "g"), "");
  const re = new RegExp(`<${ND}t(?:\\s[^>]*)?(?:/>|>([\\s\\S]*?)</${ND}t>)`, "g");
  let kq = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(sach)) !== null) kq += m[1] ?? "";
  return giaiMa(kq);
}

function docChuoiChung(xml: string): string[] {
  const ds: string[] = [];
  const re = new RegExp(`<${ND}si(?:\\s[^>]*)?(?:/>|>([\\s\\S]*?)</${ND}si>)`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) ds.push(m[1] ? gomChu(m[1]) : "");
  return ds;
}

function laDinhDangNgay(id: number, ma: string | undefined): boolean {
  if ((id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58))
    return true;
  if (!ma) return false;
  const sach = ma.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
  return /[dmyhs]/i.test(sach);
}

// Trả về danh sách "ô nào là ô ngày" theo chỉ số kiểu (style) của Excel
function docKieuNgay(xml: string | null): boolean[] {
  if (!xml) return [];
  const maTuyChon = new Map<number, string>();
  const reF = /<numFmt\b([^>]*?)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = reF.exec(xml)) !== null) {
    const id = /numFmtId="(\d+)"/.exec(m[1]);
    const ma = /formatCode="([^"]*)"/.exec(m[1]);
    if (id && ma) maTuyChon.set(parseInt(id[1], 10), giaiMa(ma[1]));
  }
  const khoi = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml);
  if (!khoi) return [];
  const kq: boolean[] = [];
  const reX = /<xf\b([^>]*?)\/?>/g;
  while ((m = reX.exec(khoi[1])) !== null) {
    const id = /numFmtId="(\d+)"/.exec(m[1]);
    const n = id ? parseInt(id[1], 10) : 0;
    kq.push(laDinhDangNgay(n, maTuyChon.get(n)));
  }
  return kq;
}

function soNgayRaDate(so: number): Date {
  const ms = Math.round(((so - 25569) * 86400000) / 1000) * 1000;
  return new Date(ms);
}

function cotRaSo(chu: string): number {
  let n = 0;
  for (const ch of chu) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function thuocTinh(chuoi: string, ten: string): string | null {
  const m = new RegExp(`(?:^|\\s)${ten}="([^"]*)"`).exec(chuoi);
  return m ? m[1] : null;
}

export async function docFileXlsx(duLieu: ArrayBuffer | Uint8Array): Promise<HangExcel[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(duLieu);
  } catch {
    throw new Error("Không đọc được file. Hãy lưu file ở định dạng .xlsx (Excel Workbook) rồi thử lại.");
  }
  const doc = async (ten: string): Promise<string | null> => {
    const f = zip.file(ten);
    return f ? await f.async("string") : null;
  };

  // 1. Tìm sheet đầu tiên đang hiển thị
  let duongSheet = "xl/worksheets/sheet1.xml";
  const wb = await doc("xl/workbook.xml");
  const rels = await doc("xl/_rels/workbook.xml.rels");
  if (wb && rels) {
    const reS = new RegExp(`<${ND}sheet\\b([^>]*?)/?>`, "g");
    let m: RegExpExecArray | null;
    let rid: string | null = null;
    while ((m = reS.exec(wb)) !== null) {
      const tt = thuocTinh(m[1], "state");
      if (tt === "hidden" || tt === "veryHidden") continue;
      const id = /\b(?:[A-Za-z0-9_]+:)?id="([^"]+)"/.exec(m[1].replace(/sheetId="[^"]*"/, ""));
      if (id) {
        rid = id[1];
        break;
      }
    }
    if (rid) {
      const reR = /<Relationship\b([^>]*?)\/?>/g;
      while ((m = reR.exec(rels)) !== null) {
        if (thuocTinh(m[1], "Id") === rid) {
          const dich = thuocTinh(m[1], "Target");
          if (dich) duongSheet = dich.startsWith("/") ? dich.slice(1) : "xl/" + dich;
          break;
        }
      }
    }
  }
  const xmlSheet = await doc(duongSheet);
  if (!xmlSheet) throw new Error("File Excel không có dữ liệu để đọc");

  const sst = docChuoiChung((await doc("xl/sharedStrings.xml")) ?? "");
  const kieuNgay = docKieuNgay(await doc("xl/styles.xml"));

  // 2. Đọc từng dòng, từng ô
  const hang: HangExcel[] = [];
  const reRow = new RegExp(`<${ND}row\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${ND}row>)`, "g");
  let stt = 0;
  let r: RegExpExecArray | null;
  while ((r = reRow.exec(xmlSheet)) !== null) {
    stt++;
    const so = parseInt(thuocTinh(r[1], "r") ?? "", 10) || stt;
    if (!r[2]) continue;
    const o: OExcel[] = [];
    const reC = new RegExp(`<${ND}c\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${ND}c>)`, "g");
    let c: RegExpExecArray | null;
    let cotMacDinh = 0;
    while ((c = reC.exec(r[2])) !== null) {
      const ref = /(?:^|\s)r="([A-Z]+)\d+"/.exec(c[1]);
      const cot = ref ? cotRaSo(ref[1]) : cotMacDinh;
      cotMacDinh = cot + 1;
      const kieu = thuocTinh(c[1], "t");
      const s = parseInt(thuocTinh(c[1], "s") ?? "", 10);
      const noi = c[2] ?? "";
      const v = new RegExp(`<${ND}v>([\\s\\S]*?)</${ND}v>`).exec(noi);
      let gt: OExcel = null;
      if (kieu === "inlineStr") {
        gt = gomChu(noi);
      } else if (v) {
        const th = v[1];
        if (kieu === "s") gt = sst[parseInt(th, 10)] ?? null;
        else if (kieu === "str") gt = giaiMa(th);
        else if (kieu === "b") gt = th.trim() === "1";
        else if (kieu === "e") gt = null;
        else if (kieu === "d") {
          const t = Date.parse(th);
          gt = isNaN(t) ? null : new Date(t);
        } else {
          const so2 = parseFloat(th);
          if (!isNaN(so2)) gt = !isNaN(s) && kieuNgay[s] ? soNgayRaDate(so2) : so2;
        }
      }
      if (typeof gt === "string" && gt.trim() === "") gt = null;
      o[cot] = gt;
    }
    for (let i = 0; i < o.length; i++) if (o[i] === undefined) o[i] = null;
    if (o.some((x) => x !== null)) hang.push({ so, o });
  }
  return hang;
}
