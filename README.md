# Medical Bill Analyzer

A minimal MVP SaaS built with Next.js App Router, TypeScript, Stripe Checkout, and the OpenAI API.

## What it does

1. The user uploads a medical bill file on the landing page.
2. The app extracts bill text in memory only.
3. PDFs are parsed directly, text files are read directly, and images are OCR'd locally.
4. The user is redirected to Stripe Checkout for a one-time payment.
5. After a successful payment, Stripe redirects back to `/result`.
6. The result page verifies that the checkout session is paid.
7. The user clicks **Generate Analysis** to trigger the OpenAI analysis.
8. The app displays a structured report with actionable sections.

## Tech stack

- Next.js App Router
- TypeScript
- Stripe Checkout
- OpenAI API
- Vercel-ready deployment
- No database
- No file storage

## Environment variables

Create a `.env.local` file in the project root:

```bash
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRICE_ID=price_123456789
STRIPE_WEBHOOK_SECRET=whsec_123456789
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Local development

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Stripe setup

1. Create a one-time Stripe price for `$9.99`.
2. Copy the price ID into `STRIPE_PRICE_ID`.
3. Use your Stripe secret key for `STRIPE_SECRET_KEY`.
4. Add a webhook endpoint in Stripe that points to:

```text
http://localhost:3000/api/webhook/stripe
```

5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
6. Set the success URL to:

```text
http://localhost:3000/result?session_id={CHECKOUT_SESSION_ID}
```

7. Set the cancel URL to:

```text
http://localhost:3000/
```

## Notes

- Uploaded files are not stored.
- File extraction happens in memory only.
- PDF parsing uses `pdf-parse`.
- Image OCR uses `tesseract.js`.
- Analysis is only allowed after Stripe payment is verified.
- The OpenAI model used is `gpt-4o-mini`.

## Project structure

```text
medical-bill-checker/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts
│   │   ├── checkout/route.ts
│   │   ├── extract/route.ts
│   │   └── webhook/stripe/route.ts
│   ├── result/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── file-upload-form.tsx
│   ├── report-view.tsx
│   └── result-client.tsx
├── lib/
│   ├── analysis.ts
│   ├── bill.ts
│   ├── openai.ts
│   ├── stripe.ts
│   └── types.ts
├── .env.example
├── .gitignore
├── next-env.d.ts
├── next.config.ts
├── package.json
├── README.md
└── tsconfig.json
```

## Vercel deployment

This app is ready to deploy to Vercel once the environment variables are configured:

- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`
