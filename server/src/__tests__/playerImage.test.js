const {
  detectImageType,
  optimizeCloudinaryUrl,
  uploadPlayerImage,
  deletePlayerImage,
} = require('../services/playerImage');

const originalEnv = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
};
const originalFetch = global.fetch;

afterEach(() => {
  if (originalEnv.cloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
  else process.env.CLOUDINARY_CLOUD_NAME = originalEnv.cloudName;
  if (originalEnv.apiKey === undefined) delete process.env.CLOUDINARY_API_KEY;
  else process.env.CLOUDINARY_API_KEY = originalEnv.apiKey;
  if (originalEnv.apiSecret === undefined) delete process.env.CLOUDINARY_API_SECRET;
  else process.env.CLOUDINARY_API_SECRET = originalEnv.apiSecret;
  global.fetch = originalFetch;
});

describe('player image service', () => {
  it('detects supported formats from file bytes', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    expect(
      detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('image/png');
    expect(detectImageType(Buffer.from('RIFF1234WEBP'))).toBe('image/webp');
    expect(detectImageType(Buffer.from('not-an-image'))).toBeNull();
  });

  it('adds optimized delivery transformations to Cloudinary URLs', () => {
    expect(
      optimizeCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v1/player.jpg'),
    ).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_800,h_800,q_auto,f_auto/v1/player.jpg',
    );
  });

  it('uploads and removes an authenticated player image', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/player.png',
          public_id: 'biddr/players/player',
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: 'ok' }) });

    const file = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      mimetype: 'image/png',
      originalname: 'player.png',
      size: 8,
    };
    const uploaded = await uploadPlayerImage(file);

    expect(uploaded).toEqual({
      photoUrl: 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,g_auto,w_800,h_800,q_auto,f_auto/v1/player.png',
      photoPublicId: 'biddr/players/player',
    });
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
      expect.objectContaining({ method: 'POST' }),
    );

    await expect(deletePlayerImage(uploaded.photoPublicId)).resolves.toBe(true);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.cloudinary.com/v1_1/test-cloud/image/destroy',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejects files whose bytes are not an image', async () => {
    await expect(
      uploadPlayerImage({
        buffer: Buffer.from('plain text'),
        mimetype: 'image/png',
        originalname: 'fake.png',
        size: 10,
      }),
    ).rejects.toThrow(/JPG, PNG, or WebP/);
  });
});
