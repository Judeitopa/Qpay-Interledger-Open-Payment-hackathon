/**
 * Qpay Enterprise PDF Exporter
 * Generates beautifully formatted, printable PDF documents for customer profiles and leaderboards.
 */

/**
 * Format currency in Nigerian Naira
 */
function formatNaira(amount) {
  return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

/**
 * 1. Export Individual Customer Profile as PDF
 */
export function exportCustomerProfilePdf(customer, businessName = 'Amara Ventures') {
  if (!customer) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the customer profile PDF.');
    return;
  }

  const favoriteItemsHtml = Object.values(customer.itemFrequencies || {})
    .sort((a, b) => b.qty - a.qty)
    .map((item, idx) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">${idx + 1}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${item.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #4F46E5; font-weight: 600;">${item.qty}×</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 600; color: #0F172A;">${formatNaira(item.totalSpend)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #94A3B8;">No purchase items recorded</td></tr>';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Customer Profile - ${customer.name} (${customer.tag})</title>
      <style>
        @page {
          size: A4;
          margin: 18mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0F172A;
          margin: 0;
          padding: 24px;
          background: #FFF;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #4F46E5;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .brand {
          font-size: 24px;
          font-weight: 800;
          color: #4F46E5;
          letter-spacing: -0.5px;
        }
        .meta-right {
          text-align: right;
          font-size: 11px;
          color: #64748B;
        }
        .badge {
          display: inline-block;
          background: #EEF2FF;
          color: #4F46E5;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #0F172A;
          margin-top: 6px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 20px 0;
        }
        .metric-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px;
          text-align: center;
        }
        .metric-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-value {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
          margin-top: 4px;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          margin: 24px 0 10px 0;
          border-left: 3px solid #4F46E5;
          padding-left: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th {
          background: #F1F5F9;
          color: #475569;
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 700;
          padding: 8px 12px;
          text-align: left;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed #E2E8F0;
          font-size: 12px;
        }
        .info-label {
          color: #64748B;
        }
        .info-val {
          font-weight: 600;
          color: #0F172A;
        }
        .footer {
          margin-top: 36px;
          padding-top: 14px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94A3B8;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">QPAY • ENTERPRISE</div>
          <div class="title">${customer.name}</div>
          <div style="font-size: 12px; color: #4F46E5; font-weight: 600;">${customer.tag} • ${customer.phone}</div>
        </div>
        <div class="meta-right">
          <div class="badge">Customer Profile</div>
          <div style="margin-top: 4px;">Business: <strong>${businessName}</strong></div>
          <div>Export Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Visits</div>
          <div class="metric-value">${customer.visitCount}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Lifetime Spend</div>
          <div class="metric-value" style="color: #10B981;">${formatNaira(customer.totalSpent)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Average Order Value</div>
          <div class="metric-value">${formatNaira(customer.avgOrder)}</div>
        </div>
      </div>

      <div class="section-title">Patronage Schedule & Behavioral Patterns</div>
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 16px;">
        <div class="info-row">
          <span class="info-label">Peak Visiting Day:</span>
          <span class="info-val">${customer.peakDay || 'Fridays'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Preferred Time Slot:</span>
          <span class="info-val">${customer.peakTime || 'Evening Rush (5:00 PM – 9:00 PM)'}</span>
        </div>
        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Most Recent Visit:</span>
          <span class="info-val">${customer.lastVisit || 'Recent'}</span>
        </div>
      </div>

      <div class="section-title">Favorite Items Purchased</div>
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>Item Name</th>
            <th style="width: 80px; text-align: center;">Quantity</th>
            <th style="width: 120px; text-align: right;">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${favoriteItemsHtml}
        </tbody>
      </table>

      <div class="footer">
        <span>Verified by Qpay CRM & Interledger Open Payments</span>
        <span>Confidential • Internal Business Use Only</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * 2. Export Full Customer Leaderboard as PDF
 */
export function exportLeaderboardPdf(leaderboard, businessName = 'Amara Ventures') {
  if (!leaderboard || leaderboard.length === 0) {
    alert('No customer records available to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the leaderboard PDF.');
    return;
  }

  const rowsHtml = leaderboard.map((c, idx) => {
    const topItem = c.favoriteItems?.[0];
    const topItemStr = topItem ? `${topItem.qty}× ${topItem.name}` : '—';
    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 700; color: ${idx < 3 ? '#4F46E5' : '#64748B'};">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0;">
          <div style="font-weight: 700; color: #0F172A;">${c.name}</div>
          <div style="font-size: 11px; color: #64748B;">${c.phone}</div>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-family: monospace; font-weight: 600; color: #4F46E5;">${c.tag}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 700;">${c.visitCount}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; color: #475569; font-size: 11px;">${topItemStr}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 800; color: #0F172A;">${formatNaira(c.totalSpent)}</td>
      </tr>
    `;
  }).join('');

  const totalRevenue = leaderboard.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
  const totalVisits = leaderboard.reduce((acc, c) => acc + (c.visitCount || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Customer Leaderboard - ${businessName}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0F172A;
          margin: 0;
          padding: 20px;
          background: #FFF;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #4F46E5;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .brand {
          font-size: 22px;
          font-weight: 800;
          color: #4F46E5;
        }
        .summary-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }
        .summary-card {
          flex: 1;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 16px;
        }
        .summary-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748B;
        }
        .summary-val {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th {
          background: #F1F5F9;
          color: #475569;
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 700;
          padding: 10px 12px;
          text-align: left;
        }
        .footer {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94A3B8;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">QPAY • CUSTOMER INTELLIGENCE REPORT</div>
          <div style="font-size: 13px; color: #64748B; font-weight: 600; margin-top: 2px;">
            ${businessName} • Customer Rankings by Patronage & Lifetime Value
          </div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #64748B;">
          <div>Export Date: <strong>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
          <div>Total Listed: <strong>${leaderboard.length} customers</strong></div>
        </div>
      </div>

      <div class="summary-bar">
        <div class="summary-card">
          <div class="summary-label">Total Unique Customers</div>
          <div class="summary-val">${leaderboard.length}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Customer Visits</div>
          <div class="summary-val">${totalVisits}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Gross Customer Spend</div>
          <div class="summary-val" style="color: #10B981;">${formatNaira(totalRevenue)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">Rank</th>
            <th>Customer & Phone</th>
            <th>Qpay Tag</th>
            <th style="width: 70px; text-align: center;">Visits</th>
            <th>Top Favorite Product</th>
            <th style="width: 140px; text-align: right;">Total Spend</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <span>Verified by Qpay CRM & Interledger Open Payments</span>
        <span>Page 1 of 1 • Confidential Commercial Data</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
