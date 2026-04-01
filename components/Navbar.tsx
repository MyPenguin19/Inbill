"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/sample", label: "Sample" },
  { href: "/pricing", label: "Pricing" },
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
          height: 64px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #d8e0e7;
        }

        .nav-bar {
          width: min(900px, calc(100vw - 32px));
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .brand {
          font-size: 1.3rem;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #0f172a;
          text-decoration: none;
        }

        .desktopNav {
          display: flex;
          align-items: center;
          gap: 26px;
          margin-left: auto;
        }

        .link {
          color: #334155;
          font-size: 0.94rem;
          font-weight: 700;
          text-decoration: none;
          transition: color 160ms ease;
        }

        .link:hover {
          color: #0f172a;
        }

        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 10px;
          border: 1px solid #0b6a4d;
          background: #0f7757;
          color: #ffffff;
          font-size: 0.94rem;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 10px 22px rgba(15, 119, 87, 0.18);
        }

        .burger {
          display: none;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          color: #0f172a;
          cursor: pointer;
        }

        .overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          justify-content: flex-end;
          background: rgba(15, 23, 42, 0.28);
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
          box-shadow: -16px 0 36px rgba(15, 23, 42, 0.12);
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
          margin-bottom: 4px;
        }

        .panelTitle {
          font-size: 1.3rem;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #0f172a;
        }

        .close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          color: #0f172a;
          cursor: pointer;
        }

        .mobileLink {
          color: #0f172a;
          text-decoration: none;
          font-size: 1.42rem;
          line-height: 1.2;
          font-weight: 800;
          padding: 8px 0;
        }

        .mobileCta {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          width: 100%;
          border-radius: 10px;
          border: 1px solid #0b6a4d;
          background: #0f7757;
          color: #ffffff;
          font-size: 1rem;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(15, 119, 87, 0.18);
        }

        .mobileSubtext {
          color: #64748b;
          font-size: 0.92rem;
          line-height: 1.7;
        }

        @media (max-width: 860px) {
          .desktopNav,
          .cta {
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

          <nav className="desktopNav" aria-label="Primary">
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} className="link">
                {item.label}
              </Link>
            ))}
          </nav>

          <Link href="/#analyze" className="cta">
            Check My Bill — $4.99
          </Link>

          <button
            type="button"
            className="burger"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
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
              <X size={20} />
            </button>
          </div>

          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="mobileLink" onClick={() => setMobileOpen(false)}>
              {item.label}
            </Link>
          ))}

          <Link href="/#analyze" className="mobileCta" onClick={() => setMobileOpen(false)}>
            Check My Bill — $4.99
          </Link>

          <div className="mobileSubtext">
            AI-powered medical bill review to help patients avoid overpaying. No account required.
          </div>
        </div>
      </div>
    </>
  );
}
