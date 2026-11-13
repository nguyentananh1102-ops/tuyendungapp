"use client";

import type { ReactNode } from "react";

export default function Modal({
  tieuDe,
  dong,
  rong = false,
  children,
}: {
  tieuDe: string;
  dong: () => void;
  rong?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-6">
      <div
        className={
          "mx-auto my-2 w-full rounded-xl bg-white text-gray-900 shadow-xl " +
          (rong ? "max-w-3xl" : "max-w-xl")
        }
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{tieuDe}</h2>
          <button
            type="button"
            onClick={dong}
            className="text-2xl leading-none text-gray-500"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
