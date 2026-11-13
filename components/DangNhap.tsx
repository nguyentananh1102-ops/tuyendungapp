"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { nutChinh, o } from "@/lib/ui";

export default function DangNhap() {
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [loi, setLoi] = useState("");

  async function dangNhap(e: React.FormEvent) {
    e.preventDefault();
    setLoi("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: matKhau,
    });
    if (error) {
      setLoi(
        error.message.includes("Invalid login")
          ? "Sai email hoặc mật khẩu"
          : error.message
      );
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50 text-gray-900">
      <form
        onSubmit={dangNhap}
        className="w-full max-w-sm bg-white p-6 rounded-xl shadow space-y-4"
      >
        <h1 className="text-xl font-bold text-center">Quản lý tuyển dụng</h1>
        <input
          className={o}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={o}
          type="password"
          placeholder="Mật khẩu"
          value={matKhau}
          onChange={(e) => setMatKhau(e.target.value)}
          required
        />
        {loi && <p className="text-red-600 text-sm">{loi}</p>}
        <button className={nutChinh + " w-full"}>Đăng nhập</button>
      </form>
    </main>
  );
}
