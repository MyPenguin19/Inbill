"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/sample", label: "Sample" },
  { href: "/pricing", label: "Pricing" },
  { href: "/privacy", label: "Privacy" },
] as const;

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <style jsx>{`
        .nav-shell {
          position: sticky;
          top: 0;
          z-index: 60;
          padding: 16px;
          background: rgba(249, 250, 251, 0.92);
          backdrop-filter: blur(12px);
        }

        .nav-bar {
          width: min(900px, 100%);
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
        }

        .brand {
          font-size: 22px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #111827;
          text-decoration: none;
        }

        .links {
          display: flex;
          align-items: center;
          gap: 22px;
          flex-wrap: wrap;
        }

        .link {
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }

        .burger {
          display: none;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          color: #111827;
          font-size: 20px;
          font-weight: 800;
          cursor: pointer;
        }

        .overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          justify-content: flex-end;
          background: rgba(15, 23, 42, 0.24);
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms ease;
        }

        .overlay.open {
          opacity: 1;
          pointer-events: auto;
        }

        .panel {
          width: min(100%, 420px);
          min-height: 100vh;
          background: #ffffff;
          padding: 24px;
          display: grid;
          align-content: start;
          gap: 18px;
          box-shadow: -12px 0 30px rgba(15, 23, 42, 0.12);
          transform: translateX(100%);
          transition: transform 220ms ease;
        }

        .overlay.open .panel {
          transform: translateX(0);
        }

        .panelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .panelTitle {
          font-size: 22px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #111827;
        }

        .close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          color: #111827;
          font-size: 22px;
          font-weight: 700;
          cursor: pointer;
        }

        .mobileLink {
          color: #111827;
          text-decoration: none;
          font-size: 24px;
          line-height: 1.2;
          font-weight: 800;
          padding: 8px 0;
        }

        .mobileSubtext {
          margin-top: 8px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.7;
        }

        @media (max-width: 760px) {
          .links {
            display: none;
          }

          .burger {
            display: inline-flex;
          }
        }
      `}</style>

      <header className="nav-shell">
        <div className="nav-bar">
          <Link href="/" className="brand">
            InBill
          </Link>

          <nav className="links" aria-label="Primary">
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} className="link">
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="burger"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>
        </div>
      </header>

      <div className={mobileOpen ? "overlay open" : "overlay"} onClick={() => setMobileOpen(false)}>
        <div
          className="panel"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="panelHeader">
            <div className="panelTitle">Menu</div>
            <button type="button" className="close" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)}>
              ×
            </button>
          </div>

          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="mobileLink"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <div className="mobileSubtext">
            AI-powered medical bill review to help patients avoid overpaying. No account required.
          </div>
        </div>
      </div>
    </>
  );
}
