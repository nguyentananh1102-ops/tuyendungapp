"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import DangNhap from "./DangNhap";

const MUC = [
  { href: "/ung-vien", ten: "I. Quản lý ứng viên" },
  { href: "/de-xuat", ten: "II. Quản lý đề xuất tuyển dụng" },
  { href: "/dashboard", ten: "III. Dashboard" },
  { href: "/cau-hinh", ten: "IV. Cấu hình cài đặt" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [moMenu, setMoMenu] = useState(false);
  const pathname = usePathname() ?? "";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setDangTai(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (dangTai) return <p className="p-6 text-gray-900">Đang tải...</p>;
  if (!session) return <DangNhap />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 lg:flex">
      {/* Thanh trên cùng (chỉ hiện trên điện thoại) */}
      <div className="sticky top-0 z-40 flex items-center justify-between bg-green-800 px-4 py-3 text-white lg:hidden">
        <button
          onClick={() => setMoMenu(!moMenu)}
          className="text-2xl leading-none"
          aria-label="Mở menu"
        >
          ☰
        </button>
        <span className="font-semibold">Quản lý tuyển dụng</span>
        <span className="w-6" />
      </div>

      {/* Menu bên trái */}
      <aside
        className={
          (moMenu ? "block" : "hidden") +
          " bg-green-900 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0"
        }
      >
        <div className="hidden px-5 py-5 text-lg font-bold lg:block">
          Quản lý tuyển dụng
        </div>
        <nav className="space-y-1 px-3 py-2">
          {MUC.map((m) => {
            const dang = pathname.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setMoMenu(false)}
                className={
                  "block rounded-lg px-3 py-2 text-sm " +
                  (dang
                    ? "bg-white font-semibold text-green-900"
                    : "hover:bg-green-800")
                }
              >
                {m.ten}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-green-800 px-5 py-3 text-xs text-green-100">
          <p className="truncate">{session.user.email}</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-2 underline">
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
    </div>
  );
}
