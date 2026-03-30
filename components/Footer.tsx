import Link from "next/link";

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer__top">
        <div className="app-footer__brand">
          <div className="app-footer__logo">InBill</div>
          <p className="app-footer__text">
            AI-powered medical bill review to help patients avoid overpaying.
          </p>
        </div>

        <div className="app-footer__links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/sample">Sample</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </div>
      </div>

      <div className="app-footer__note">
        This service is for informational purposes only and does not constitute medical, legal, or financial advice.
      </div>
    </footer>
  );
}
