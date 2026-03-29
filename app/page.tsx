import { FileUploadForm } from "@/components/file-upload-form";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Medical Bill Analyzer</p>
        <h1>Find Errors in Your Medical Bill</h1>
        <p className="hero-copy">
          Upload a medical bill, complete a one-time payment, and receive a structured AI review that
          highlights what you may owe, what looks questionable, and what to ask next.
        </p>
        <FileUploadForm />
      </section>
    </main>
  );
}
