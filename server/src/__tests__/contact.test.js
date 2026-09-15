const request = require('supertest');
const Contact = require('../models/Contact');
const {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
} = require('../test/testServer');

const VALID_SUBMISSION = {
  name: '  Priya Sharma  ',
  email: '  PRIYA@example.com  ',
  mobile: '  +91 98765 43210  ',
  place: '  Chandigarh  ',
  message: '  We need help hosting a college auction.  ',
};

let app;
let originalFetch;
let originalApiKey;
let originalContactEmail;
let originalFromEmail;

beforeAll(async () => {
  app = await startTestEnv();
  originalFetch = global.fetch;
  originalApiKey = process.env.RESEND_API_KEY;
  originalContactEmail = process.env.CONTACT_EMAIL;
  originalFromEmail = process.env.RESEND_FROM_EMAIL;
});

afterAll(async () => {
  global.fetch = originalFetch;
  await stopTestEnv();
});

beforeEach(async () => {
  await clearDatabase();
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_EMAIL;
  delete process.env.RESEND_FROM_EMAIL;
  global.fetch = originalFetch;
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalApiKey;

  if (originalContactEmail === undefined) delete process.env.CONTACT_EMAIL;
  else process.env.CONTACT_EMAIL = originalContactEmail;

  if (originalFromEmail === undefined) delete process.env.RESEND_FROM_EMAIL;
  else process.env.RESEND_FROM_EMAIL = originalFromEmail;

  global.fetch = originalFetch;
});

describe('POST /api/contact', () => {
  it('stores a normalized contact submission', async () => {
    const response = await request(app).post('/api/contact').send(VALID_SUBMISSION);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.notificationStatus).toBe('skipped');

    const contact = await Contact.findById(response.body.data.id).lean();
    expect(contact).toMatchObject({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      mobile: '+91 98765 43210',
      place: 'Chandigarh',
      message: 'We need help hosting a college auction.',
      status: 'new',
      notificationStatus: 'skipped',
    });
    expect(contact.notificationAttemptedAt).toBeInstanceOf(Date);
  });

  it('rejects invalid fields without storing a submission', async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'A',
      email: 'not-an-email',
      mobile: '123',
      place: '',
      message: 'No',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors.map((error) => error.field)).toEqual([
      'name',
      'email',
      'mobile',
      'place',
      'message',
    ]);
    expect(await Contact.countDocuments()).toBe(0);
  });

  it('emails the configured contact inbox and records delivery', async () => {
    process.env.RESEND_API_KEY = 're_contact_test';
    process.env.RESEND_FROM_EMAIL = 'Biddr <noreply@example.com>';
    process.env.CONTACT_EMAIL = 'owner@example.com';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_contact_123' }),
    });

    const response = await request(app).post('/api/contact').send(VALID_SUBMISSION);

    expect(response.status).toBe(201);
    expect(response.body.data.notificationStatus).toBe('sent');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = global.fetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(url).toBe('https://api.resend.com/emails');
    expect(payload).toEqual(expect.objectContaining({
      from: 'Biddr <noreply@example.com>',
      to: ['owner@example.com'],
      subject: 'New Biddr enquiry from Priya Sharma',
    }));
    expect(payload.text).toContain('priya@example.com');
    expect(payload.text).toContain('We need help hosting a college auction.');

    const contact = await Contact.findById(response.body.data.id).lean();
    expect(contact.notificationStatus).toBe('sent');
  });

  it('keeps the saved submission and reports delayed delivery when email fails', async () => {
    process.env.RESEND_API_KEY = 're_contact_test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Unavailable',
      text: async () => 'temporarily unavailable',
    });

    const response = await request(app).post('/api/contact').send(VALID_SUBMISSION);

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(response.body.data.notificationStatus).toBe('failed');
    expect(response.body.message).toMatch(/message was saved/i);

    const contact = await Contact.findById(response.body.data.id).lean();
    expect(contact.notificationStatus).toBe('failed');
  });
});
