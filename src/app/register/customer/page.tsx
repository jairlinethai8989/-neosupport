import { Suspense } from "react";
import RegistrationForm from "./RegistrationForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ลงทะเบียน — NEO Support",
  robots: { index: false, follow: false },
};

export default function RegistrationPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", justifyContent: "center", alignItems: "center", backgroundColor: "var(--bg-color)", padding: "1rem" }}>
      <Suspense fallback={<div style={{ color: "var(--text-muted)" }}>กำลังโหลด...</div>}>
        <RegistrationForm />
      </Suspense>
    </div>
  );
}
