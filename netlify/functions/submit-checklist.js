const { getStore } = require('@netlify/blobs');
const nodemailer = require('nodemailer');

// Site email routing
const DEPOT_EMAILS = {
  NSW: 'syd.operations@marineautodepot.com.au',
  QLD: 'qld.operations@marineautodepot.com.au',
  WA: 'wa.operations@marineautodepot.com.au',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function statusLabel(status) {
  if (status === 'ok') return '✔ No Issues';
  if (status === 'issue') return '✘ Issue Found';
  if (status === 'triggered') return '✘ TRIGGERED — Action Taken';
  if (status === 'clear') return '✔ Not Triggered';
  return '—';
}

function buildEmailHTML(data) {
  const m = data.meta;
  const s = data.signoff;
  const c = data.checks;
  const r = data.records;

  const hasIssues = Object.values(c).some(ch => ch.status === 'issue' || ch.status === 'triggered');
  const alertBanner = hasIssues
    ? `<div style="background:#c0392b;color:white;padding:14px 20px;border-radius:8px;margin-bottom:20px;font-weight:700;font-size:15px;">⚠ This checklist contains issues requiring attention</div>`
    : `<div style="background:#1a6b3a;color:white;padding:14px 20px;border-radius:8px;margin-bottom:20px;font-weight:700;font-size:15px;">✔ No issues detected this week</div>`;

  const checkRow = (ref, label, check) => {
    if (!check || !check.status) return '';
    const isIssue = check.status === 'issue' || check.status === 'triggered';
    const color = isIssue ? '#c0392b' : '#1a6b3a';
    const days = check.days ? Object.entries(check.days).filter(([,v])=>v).map(([d])=>d.toUpperCase()).join(', ') : '';
    return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:700;font-size:13px;color:#2d3748;width:80px;">${ref}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#2d3748;">${label}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">
          <span style="background:${isIssue ? '#fdecea' : '#e8f4ec'};color:${color};padding:3px 9px;border-radius:12px;font-size:12px;font-weight:700;">${statusLabel(check.status)}</span>
        </td>
      </tr>
      ${days ? `<tr><td></td><td colspan="2" style="padding:4px 14px 10px;font-size:12px;color:#718096;border-bottom:1px solid #e2e8f0;">Days completed: ${days}</td></tr>` : ''}
      ${isIssue && check.notes ? `<tr><td></td><td colspan="2" style="padding:4px 14px 10px;border-bottom:1px solid #e2e8f0;"><div style="background:#fff3e0;border:1px solid #f0a050;border-radius:6px;padding:10px 12px;font-size:13px;color:#7a4f00;">${check.notes}</div></td></tr>` : ''}
    `;
  };

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f8fa;margin:0;padding:0;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#1a6b3a;color:white;padding:20px 24px;border-radius:10px 10px 0 0;">
      <div style="font-size:18px;font-weight:800;">Class 1.3 Site Hygiene Monitoring Checklist</div>
      <div style="font-size:13px;opacity:0.8;margin-top:4px;">DAZMAC / Marine Auto Depot — ${m.site} Depot</div>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 10px 10px;">
      
      ${alertBanner}

      <table style="width:100%;margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;border-collapse:collapse;">
        <tr style="background:#f7f8fa;">
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;">Site</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:600;">${m.site}</td>
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;">Week Of</td>
          <td style="padding:10px 14px;font-size:13px;">${formatDate(m.weekDate + 'T00:00:00')}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;">Accredited Person</td>
          <td style="padding:10px 14px;font-size:13px;">${m.accreditedPerson}</td>
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;">Accreditation No.</td>
          <td style="padding:10px 14px;font-size:13px;">${m.accreditationNo || '—'}</td>
        </tr>
        <tr style="background:#f7f8fa;">
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;">Signed By</td>
          <td style="padding:10px 14px;font-size:13px;">${s.name}</td>
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;">Date Completed</td>
          <td style="padding:10px 14px;font-size:13px;">${formatDate(s.date + 'T00:00:00')}</td>
        </tr>
      </table>

      <h3 style="font-size:13px;text-transform:uppercase;color:#718096;font-weight:700;letter-spacing:0.5px;margin-bottom:10px;">Monitoring Results</h3>
      <table style="width:100%;border:1px solid #e2e8f0;border-radius:8px;border-collapse:collapse;margin-bottom:20px;">
        ${checkRow('7.1', 'Daily Walk — Animals & Insects', c['7.1'])}
        ${checkRow('7.5', 'Weekly Walk — Vegetation', c['7.5'])}
        ${checkRow('7.2', 'Immediate: Live Animal', c['7.2'])}
        ${checkRow('7.3', 'Immediate: Live Insects', c['7.3'])}
      </table>

      <h3 style="font-size:13px;text-transform:uppercase;color:#718096;font-weight:700;letter-spacing:0.5px;margin-bottom:10px;">Records Compliance</h3>
      <table style="width:100%;border:1px solid #e2e8f0;border-radius:8px;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;font-weight:600;">7.7 — Monitoring register completed</td><td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${r['7.7'] ? '✔ Confirmed' : 'Not confirmed'}</td></tr>
        <tr><td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;font-weight:600;">7.8 — DAFF site access maintained</td><td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${r['7.8'] ? '✔ Confirmed' : 'Not confirmed'}</td></tr>
        <tr><td style="padding:10px 14px;font-size:13px;font-weight:600;">7.6 — Vegetation disposed as biosecurity waste</td><td style="padding:10px 14px;font-size:13px;">${r['7.6'] ? '✔ Yes' : '—'}</td></tr>
      </table>

      ${s.generalNotes ? `<div style="background:#f7f8fa;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:20px;"><strong style="font-size:12px;text-transform:uppercase;color:#718096;">General Notes</strong><p style="font-size:13px;margin-top:6px;color:#2d3748;">${s.generalNotes}</p></div>` : ''}

      ${hasIssues ? '<div style="background:#fff3e0;border:2px solid #f0a050;border-radius:8px;padding:14px 16px;font-size:13px;color:#7a4f00;"><strong>⚠ Action Required:</strong> One or more issues were detected. Please review the details above and ensure appropriate corrective actions have been completed and documented in the monitoring register. If a live animal or insect was detected, confirm DAFF has been notified.</div>' : ''}

      <p style="font-size:11px;color:#a0aec0;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:14px;">Submitted ${new Date(data.submittedAt).toLocaleString('en-AU')} · Class 1.3 v7.0 (DAFF December 2025) · Keep all completed checklists on file — required for DAFF audit.</p>
    </div>
  </div>
</body>
</html>`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Validate required fields
  if (!data.meta?.site || !data.meta?.weekDate || !data.meta?.accreditedPerson) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  // Store in Netlify Blobs
  try {
    const store = getStore('site-hygiene-records');
    const recordId = `${data.meta.site}-${data.meta.weekDate}-${Date.now()}`;
    
    // Strip photo data from main record to keep it lean; store photos separately
    const recordToStore = JSON.parse(JSON.stringify(data));
    const photoStore = getStore('site-hygiene-photos');
    
    Object.keys(recordToStore.checks || {}).forEach(ref => {
      const photos = recordToStore.checks[ref].photos;
      if (photos && photos.length > 0) {
        photos.forEach(async (photo, idx) => {
          const photoKey = `${recordId}-${ref}-${idx}`;
          // Store base64 photo data
          await photoStore.set(photoKey, photo.data, { metadata: { name: photo.name, ref, recordId } });
          // Replace with reference key
          recordToStore.checks[ref].photos[idx] = { name: photo.name, key: photoKey };
        });
      }
    });

    await store.setJSON(recordId, recordToStore);

  } catch (storageError) {
    console.error('Storage error:', storageError);
    // Don't fail the submission if storage fails — still try to send email
  }

  // Send email
  const toEmail = DEPOT_EMAILS[data.meta.site];
  if (!toEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown site' }) };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const hasIssues = Object.values(data.checks || {}).some(c => c.status === 'issue' || c.status === 'triggered');
    const subject = hasIssues
      ? `⚠ [ACTION REQUIRED] Site Hygiene Checklist — ${data.meta.site} — Week of ${data.meta.weekDate}`
      : `✔ Site Hygiene Checklist Submitted — ${data.meta.site} — Week of ${data.meta.weekDate}`;

    // Build attachments from photos
    const attachments = [];
    Object.entries(data.checks || {}).forEach(([ref, check]) => {
      (check.photos || []).forEach((photo, idx) => {
        if (photo.data && photo.data.startsWith('data:image')) {
          const matches = photo.data.match(/^data:image\/(\w+);base64,(.+)$/);
          if (matches) {
            attachments.push({
              filename: photo.name || `photo-${ref}-${idx+1}.jpg`,
              content: matches[2],
              encoding: 'base64',
            });
          }
        }
      });
    });

    await transporter.sendMail({
      from: `"DAZMAC Site Hygiene" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: toEmail,
      subject,
      html: buildEmailHTML(data),
      attachments,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Checklist saved and email sent.' }),
    };

  } catch (emailError) {
    console.error('Email error:', emailError);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, warning: 'Saved but email failed: ' + emailError.message }),
    };
  }
};
