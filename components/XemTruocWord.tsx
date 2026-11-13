"use client";

import { useEffect, useRef, useState } from "react";
import { nutChinh, nutNho, nutPhu } from "@/lib/ui";
import { taiFileVeMay } from "@/lib/xuatWord";

// Cửa sổ xem trước file Word (hiển thị ngay trên trình duyệt, chưa tải về máy)
export default function XemTruocWord({
  bytes,
  tenFile,
  dong,
}: {
  bytes: Uint8Array;
  tenFile: string;
  dong: () => void;
}) {
  const khung = useRef<HTMLDivElement>(null);
  const [dang, setDang] = useState(true);
  const [loi, setLoi] = useState("");
  const [zoom, setZoom] = useState(() =>
    typeof window === "undefined"
      ? 0.8
      : Math.max(0.35, Math.min(1, (window.innerWidth - 40) / 1190))
  );

  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        const tam = document.createElement("div");
        const blob = new Blob([bytes as BlobPart], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        await renderAsync(blob, tam, undefined, {
          className: "docx",
          inWrapper: true,
          breakPages: true,
          useBase64URL: true,
        });
        if (huy || !khung.current) return;
        khung.current.replaceChildren(tam);
      } catch (e) {
        if (!huy) {
          setLoi(e instanceof Error ? e.message : "Không hiển thị được bản xem trước");
        }
      } finally {
        if (!huy) setDang(false);
      }
    })();
    return () => {
      huy = true;
    };
  }, [bytes]);

  return (
    <div className="fixed inset-0 z-[60] flex bg-black/60 p-2 sm:p-4">
      <div className="flex w-full flex-col overflow-hidden rounded-xl bg-white text-gray-900 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="font-semibold">Xem trước — {tenFile}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={nutNho}
              onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}
            >
              Thu nhỏ −
            </button>
            <button
              className={nutNho}
              onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}
            >
              Phóng to +
            </button>
            <button className={nutChinh} onClick={() => taiFileVeMay(bytes, tenFile)}>
              Tải file Word về máy
            </button>
            <button className={nutPhu} onClick={dong}>
              Đóng
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-300">
          {dang && <p className="p-6 text-sm text-gray-700">Đang tạo bản xem trước...</p>}
          {loi && (
            <p className="p-6 text-sm text-red-600">
              {loi}. Bạn vẫn có thể bấm “Tải file Word về máy” để mở bằng Word.
            </p>
          )}
          <div ref={khung} style={{ zoom }} />
        </div>
        <p className="border-t px-4 py-2 text-xs text-gray-500">
          Bản xem trước chỉ gần giống file Word thật (phông chữ và ngắt trang có thể lệch đôi chút).
        </p>
      </div>
    </div>
  );
}
