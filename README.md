# Qpay

A peer-to-peer (P2P) and merchant QR payment web application built with React, Vite, Tailwind CSS, and an Interledger Open Payments Node.js backend. Qpay enables instant scan-to-pay transactions between individuals and businesses, itemized merchant billing, customer loyalty tracking with PDF exports, and monthly business performance analytics powered by live Interledger Open Payments API rails.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
  - [Individual Accounts](#individual-accounts)
  - [Business & Merchant Accounts](#business--merchant-accounts)
  - [QR Code Engine](#qr-code-engine)
  - [Security & Risk Controls](#security--risk-controls)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Running Unit Tests](#running-unit-tests)
  - [Building for Production](#building-for-production)
- [Deployment on Vercel](#deployment-on-vercel)
- [Payment Flow & QR Payload Format](#payment-flow--qr-payload-format)
- [License](#license)

---

## Overview

Qpay is designed to streamline cash-less payments in retail, dining, and daily peer-to-peer scenarios. Users can create either an **Individual** or **Business** profile:
- **Individuals** can top up their wallet, send money via phone number or tag, and scan QR codes at checkout counters to pay within seconds.
- **Businesses** can issue itemized point-of-sale bills, collect customer payments via static or dynamic QR codes, track top returning customers on an automated Leaderboard, download customer dossiers as PDFs, and review monthly sales performance.

---

## Key Features

### Individual Accounts
- **Digital Wallet:** Real-time Naira balance tracking with instant wallet top-up routed through Interledger Open Payments incoming payment rails.
- **Send Money:** Transfer to registered users via phone number, Qpay tag, or direct account search.
- **Receive via QR:** Generate static or custom-amount QR codes for contactless incoming payments.
- **Transaction History:** Filterable ledger of credits and debits with detailed receipts and reference numbers.
- **Security PIN:** 4-digit PIN verification before executing any debit or wallet transfer.

### Business & Merchant Accounts
- **Itemized Bill Creation:** Add products, quantities, and unit prices with automated subtotal, discount, and tax calculations.
- **Payments Ledger:** Real-time settlement feed showing successful, pending, and refunded customer bills.
- **Customer Leaderboard:** 
  - Automatically identifies top returning customers based on visit count, total spend, and average order value.
  - Generates downloadable individual customer profile summaries and full leaderboard reports in printable A4 PDF format.
- **Performance Analytics:** 
  - Month-over-month revenue and order volume comparisons.
  - Donut chart displaying bestselling products by revenue and sales volume.
  - Practical strategic advice tailored to current sales velocity and customer trends.

### QR Code Engine
- **Camera Scanner:** Built with `html5-qrcode` to automatically activate the device's rear/environment camera with smooth auto-scan and permission handling.
- **Cross-Platform:** Works on desktop webcams, Android Chrome, and iOS Safari under HTTPS.
- **Fallback Methods:** Supports scanning from image file uploads or manual entry of payment references.

### Security & Risk Controls
- **Transaction & Daily Limits:** Tiered spending caps based on verification status.
- **Duplicate Prevention:** Idempotency checks to prevent accidental double-taps on payments.
- **Interledger Open Payments Vault:** Ed25519 HTTP-signed Open Payments backend handling wallet resolution, incoming payments, ILP quotes, and interactive GNAP outgoing payment grants.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 18](https://react.dev/) |
| **Build Tool** | [Vite 6](https://vite.dev/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **QR Code Generation** | `qrcode.react` |
| **QR Code Scanning** | `html5-qrcode` |
| **Visual Effects** | `canvas-confetti` |
| **PDF Generation** | Native A4 Printable Window / Blob Generator |
| **Payment Rail** | [Interledger Open Payments](https://openpayments.dev/) (`@interledger/open-payments`) |
| **Routing / Hosting** | Single-Page Application (SPA) with Vercel API & SPA rewrites |

---

## Project Structure

```text
Q-PAY/
├── api/                    # Vercel serverless functions for Interledger Open Payments
├── server/                 # Node.js Interledger Open Payments backend service & router
├── public/                 # Static assets
├── src/
│   ├── assets/             # Brand logos and images
│   ├── components/         # Reusable UI and view components
│   │   ├── AddMoneyModal.jsx           # Interledger Open Payments top-up modal
│   │   ├── BalanceDashboard.jsx        # Individual wallet overview
│   │   ├── BusinessPerformanceTab.jsx  # Sales analytics & product donut chart
│   │   ├── CustomerLeaderboardTab.jsx  # Customer rankings & PDF exports
│   │   ├── CustomerPaymentsTab.jsx     # Merchant billing & payments log
│   │   ├── ReceiveView.jsx             # QR code generator view
│   │   ├── ScannerView.jsx             # Camera QR code scanner
│   │   ├── SendView.jsx                # P2P payment flow & PIN check
│   │   └── ...
│   ├── utils/              # Helper utilities
│   │   ├── interledgerApi.js           # Frontend client for /api/interledger/*
│   │   ├── interledgerVault.js         # Zero-digit tag & wallet identity vault
│   │   ├── paymentSync.js              # Real-time Open Payments & device sync
│   │   ├── pdfExport.js                # A4 PDF exporter for dossiers & reports
│   │   └── soundEffects.js             # Payment success audio cues
│   ├── App.jsx             # Root application controller & navigation
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind CSS directives & custom animations
├── tests/                  # Standalone automated unit tests
│   ├── crossDevicePayment.test.js      # Cross-device sync verification
│   ├── korapayVault.test.js            # Ledger integrity & escrow tests
│   ├── securityAndLimits.test.js       # Daily caps & PIN security tests
│   └── run-all-tests.js                # Node test runner
├── vercel.json             # SPA routing rewrite configuration
├── package.json            # Project scripts & dependencies
└── vite.config.js          # Vite configuration
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
- `npm` (comes bundled with Node.js)

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
cd Q-PAY
npm install
```

### Running Locally
Start the development server with local network access enabled:

```bash
npm run dev
```

Open your browser at `http://localhost:3000/`.

### Running Unit Tests
Execute the automated test suite covering ledger integrity, cross-device synchronization, and security limits:

```bash
npm test
```

### Building for Production
Create an optimized production build in the `dist/` directory:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## Deployment on Vercel

The project includes a `vercel.json` file configuring SPA rewrites to ensure direct route refreshing works seamlessly without 404 errors.

### Deploying via GitHub (Recommended)
1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **"Add New..."** → **"Project"**.
3. Import your Qpay repository.
4. Vercel automatically detects the Vite preset:
   - **Build Command:** `vite build`
   - **Output Directory:** `dist`
5. Click **"Deploy"**.

> **Note on Camera Permissions:** Modern mobile browsers (iOS Safari, Android Chrome) require a secure **HTTPS** origin to grant camera access. Vercel automatically provisions SSL/TLS certificates for all `.vercel.app` domains, ensuring the QR scanner works out-of-the-box upon deployment.

---

## Payment Flow & QR Payload Format

Qpay utilizes a lightweight, URI-safe string payload for contactless payments:

```text
QPAY:PAY:<RECIPIENT_PHONE>:<RECIPIENT_NAME>:<AMOUNT>:<REFERENCE>
```

- When scanned, the application parses the payload, validates the recipient's registered identity, prompts for confirmation, and prompts for the sender's 4-digit PIN.
- Upon authorization, balances are debited from the sender and credited to the recipient's wallet, logging an entry in both users' transaction ledgers.

---

## License

This project is licensed under the MIT License.
