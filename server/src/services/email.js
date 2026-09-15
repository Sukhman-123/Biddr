const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getSender = () =>
  process.env.RESEND_FROM_EMAIL || 'Biddr <onboarding@resend.dev>';

const getSupportEmail = () =>
  process.env.SUPPORT_EMAIL || 'support@biddr.app';

const getContactEmail = () =>
  process.env.CONTACT_EMAIL || getSupportEmail();

const buildPasswordResetEmail = ({ fullName, resetUrl }) => {
  const safeName = escapeHtml(fullName || 'there');
  const safeResetUrl = escapeHtml(resetUrl);
  const supportEmail = escapeHtml(getSupportEmail());

  const text = [
    `Hi ${fullName || 'there'},`,
    '',
    'We received a request to reset your Biddr password.',
    `Reset your password: ${resetUrl}`,
    '',
    'This link expires in 15 minutes. If you did not request this, you can ignore this email.',
    '',
    'Biddr',
  ].join('\n');

  const html = `
    <div style="margin:0;padding:0;background:#05070b;font-family:Inter,Arial,sans-serif;color:#e6e6ec;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05070b;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111217;border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 8px;">
                  <p style="margin:0 0 10px;color:#ffd24a;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;">Biddr password reset</p>
                  <h1 style="margin:0;color:#f4f4f6;font-size:30px;line-height:1.1;">Reset your password</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 28px 0;">
                  <p style="margin:0;color:#b6b6c0;font-size:15px;line-height:1.6;">Hi ${safeName}, we received a request to reset your Biddr password. Use the secure link below to choose a new password.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 28px;">
                  <a href="${safeResetUrl}" style="display:inline-block;background:#f5b94a;color:#1a1306;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;padding:14px 20px;border-radius:14px;">Reset password</a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px;">
                  <p style="margin:0 0 12px;color:#8a8a94;font-size:13px;line-height:1.6;">This link expires in 15 minutes. If you did not request this reset, you can safely ignore this email.</p>
                  <p style="margin:0;color:#8a8a94;font-size:12px;line-height:1.6;">If the button does not work, copy this URL into your browser:<br><a href="${safeResetUrl}" style="color:#ffd24a;word-break:break-all;">${safeResetUrl}</a></p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px;background:rgba(255,255,255,0.035);color:#8a8a94;font-size:12px;line-height:1.5;">
                  Need help? Contact ${supportEmail}.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { html, text };
};

const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is required to send emails');
    }
    return { skipped: true, reason: 'RESEND_API_KEY is not configured' };
  }

  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available for email delivery');
  }

  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'biddr-api/1.0',
    },
    body: JSON.stringify({
      from: getSender(),
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch (error) {
      details = response.statusText;
    }
    throw new Error(`Resend email failed (${response.status}): ${details}`);
  }

  return response.json();
};

const sendPasswordResetEmail = async ({ to, fullName, resetUrl }) => {
  const { html, text } = buildPasswordResetEmail({ fullName, resetUrl });
  return sendEmail({
    to,
    subject: 'Reset your Biddr password',
    html,
    text,
  });
};

const buildContactNotificationEmail = ({
  name,
  email,
  mobile,
  place,
  message,
  createdAt,
}) => {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMobile = escapeHtml(mobile);
  const safePlace = escapeHtml(place);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');
  const receivedAt = createdAt
    ? new Date(createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const safeReceivedAt = escapeHtml(receivedAt);

  const text = [
    'New Biddr contact enquiry',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Mobile: ${mobile}`,
    `Place: ${place}`,
    `Received: ${receivedAt} IST`,
    '',
    'Message:',
    message,
  ].join('\n');

  const html = `
    <div style="margin:0;padding:24px;background:#05070b;font-family:Inter,Arial,sans-serif;color:#e6e6ec;">
      <div style="max-width:640px;margin:0 auto;background:#111217;border:1px solid rgba(255,255,255,0.12);border-radius:20px;overflow:hidden;">
        <div style="padding:26px 28px 18px;">
          <p style="margin:0 0 8px;color:#ffd24a;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;">Biddr contact enquiry</p>
          <h1 style="margin:0;color:#f4f4f6;font-size:26px;line-height:1.2;">New message from ${safeName}</h1>
        </div>
        <div style="padding:0 28px 22px;color:#b6b6c0;font-size:14px;line-height:1.7;">
          <p style="margin:0;"><strong style="color:#f4f4f6;">Email:</strong> ${safeEmail}</p>
          <p style="margin:0;"><strong style="color:#f4f4f6;">Mobile:</strong> ${safeMobile}</p>
          <p style="margin:0;"><strong style="color:#f4f4f6;">Place:</strong> ${safePlace}</p>
          <p style="margin:0;"><strong style="color:#f4f4f6;">Received:</strong> ${safeReceivedAt} IST</p>
        </div>
        <div style="margin:0 28px 28px;padding:18px;background:rgba(255,255,255,0.045);border-radius:14px;color:#e6e6ec;font-size:15px;line-height:1.7;">
          ${safeMessage}
        </div>
      </div>
    </div>
  `;

  return { html, text };
};

const sendContactNotificationEmail = async (contact) => {
  const { html, text } = buildContactNotificationEmail(contact);
  const subjectName = String(contact.name || 'Website visitor')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  return sendEmail({
    to: getContactEmail(),
    subject: `New Biddr enquiry from ${subjectName}`,
    html,
    text,
  });
};

module.exports = {
  buildContactNotificationEmail,
  buildPasswordResetEmail,
  sendEmail,
  sendContactNotificationEmail,
  sendPasswordResetEmail,
};
