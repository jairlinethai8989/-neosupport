import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NEO Support Portal",
  description: "LINE LIFF Portal for NEO Support",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="liff-container" style={{ 
      minHeight: "100dvh", 
      background: "#f8fafc", /* Slate 50 - Lean vibe */
      color: "#0f172a", /* Slate 900 */
      fontFamily: "var(--font-sarabun), system-ui, sans-serif"
    }}>
      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "0" }}>
        {children}
      </main>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .liff-container {
          --liff-primary: #006ce4;
          --liff-bg: #f8fafc;
          --liff-card: #ffffff;
          --liff-text: #1e293b;
          --liff-border: #e2e8f0;
        }
        
        /* Modern Scrollbar - Hidden for minimal look */
        ::-webkit-scrollbar { width: 0px; background: transparent; }
        
        /* Glassmorphism utility */
        .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        /* Lean Input Styles */
        input, select, textarea {
          font-size: 16px !important; /* Prevent iOS zoom */
        }
      `}} />
    </div>
  );
}
