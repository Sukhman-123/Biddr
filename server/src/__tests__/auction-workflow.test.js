const request = require('supertest')
const {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
  registerUser,
  loginUser,
} = require('../test/testServer')

describe('Auction Workflow', () => {
  let app
  let hostToken, viewerToken
  let hostUser, viewerUser
  let tournament, lot

  beforeAll(async () => {
    app = await startTestEnv()
  })

  afterAll(async () => {
    await stopTestEnv()
  })

  beforeEach(async () => {
    await clearDatabase()
    app.locals.mockIo.reset()

    const hostEmail = 'host-' + Date.now() + '@test.com'
    const viewerEmail = 'viewer-' + Date.now() + '@test.com'
    const hostRes = await registerUser(app, { fullName: 'Test Host', email: hostEmail, password: 'password123' })
    const hostLogin = await loginUser(app, { email: hostEmail, password: 'password123' })
    hostToken = hostLogin.body.token
    hostUser = { id: hostRes.body.user.id, email: hostEmail, fullName: 'Test Host' }

    const viewerRes = await registerUser(app, { fullName: 'Test Viewer', email: viewerEmail, password: 'password123' })
    const viewerLogin = await loginUser(app, { email: viewerEmail, password: 'password123' })
    viewerToken = viewerLogin.body.token
    viewerUser = { id: viewerRes.body.user.id, email: viewerEmail, fullName: 'Test Viewer' }
  })

  describe('Tournament & Franchise Wallet Initialization', () => {
    it('initializes franchise wallets on tournament creation', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'IPL Auction',
          shortCode: 'IPL' + Date.now(),
          pursePerFranchise: 50000000,
          franchises: [
            { name: 'Mumbai Indians', colorHex: '#004C8F' },
            { name: 'Chennai Super Kings', colorHex: '#FCCC04' },
          ],
        })

      expect(res.status).toBe(201)
      expect(res.body.tournament.franchises).toHaveLength(2)
      expect(res.body.tournament.franchises[0].wallet.initial).toBe(50000000)
      expect(res.body.tournament.franchises[0].wallet.spent).toBe(0)
      expect(res.body.tournament.franchises[0].wallet.initial - res.body.tournament.franchises[0].wallet.spent).toBe(50000000)
    })

    it('sets auctionMode to remote by default', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Test Tournament',
          shortCode: 'TST' + Date.now(),
          pursePerFranchise: 10000000,
        })

      expect(res.status).toBe(201)
      expect(res.body.tournament.auctionMode).toBe('remote')
    })

    it('allows physical auction mode', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Physical Auction',
          shortCode: 'PHY' + Date.now(),
          auctionMode: 'physical',
        })

      expect(res.status).toBe(201)
      expect(res.body.tournament.auctionMode).toBe('physical')
    })
  })

  describe('Lot Lifecycle', () => {
    beforeEach(async () => {
      // Create tournament
      const tRes = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Lot Lifecycle Test',
          shortCode: 'LIF' + Date.now(),
          pursePerFranchise: 50000000,
          franchises: [
            { name: 'Team A', colorHex: '#000' },
            { name: 'Team B', colorHex: '#FFF' },
          ],
        })
      tournament = tRes.body.tournament

      // Create a lot
      const lRes = await request(app)
        .post(`/api/tournaments/${tournament.id}/lots`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Virat Kohli',
          style: 'Batsman',
          country: 'India',
          basePrice: 2000000,
          bidIncrement: 500000,
        })
      lot = lRes.body.lot
    })

    it('host can activate a lot', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)

      expect(res.status).toBe(200)
      expect(res.body.lot.auctionStatus).toBe('active')
      expect(res.body.lot.currentBid).toBe(2000000) // basePrice
    })

    it('viewer cannot activate a lot', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${viewerToken}`)

      expect(res.status).toBe(403)
    })

    it('activates broadcasts to room', async () => {
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)

      const emits = app.locals.mockIo.emits
      expect(emits.some(e => e.event === 'lot:activated')).toBe(true)
    })

    it('host can hammer a lot', async () => {
      // First activate
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)

      // Hammer with Team A as winner
      const franchise = tournament.franchises[0]
      const res = await request(app)
        .post(`/api/lots/${lot.id}/hammer`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id })

      expect(res.status).toBe(200)
      expect(res.body.lot.status).toBe('sold')
      expect(res.body.lot.auctionStatus).toBe('hammered')
      expect(res.body.lot.soldToFranchiseId).toBe(franchise.id)
      expect(res.body.lot.soldPrice).toBe(2000000)
    })

    it('host can pass a lot', async () => {
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)

      const res = await request(app)
        .post(`/api/lots/${lot.id}/pass`)
        .set('Authorization', `Bearer ${hostToken}`)

      expect(res.status).toBe(200)
      expect(res.body.lot.status).toBe('unsold')
      expect(res.body.lot.auctionStatus).toBe('unsold')
    })

    it('host can pause an active lot', async () => {
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)

      const res = await request(app)
        .post(`/api/lots/${lot.id}/pause`)
        .set('Authorization', `Bearer ${hostToken}`)

      expect(res.status).toBe(200)
      expect(res.body.lot.auctionStatus).toBe('paused')
    })

    it('host can resume a paused lot', async () => {
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)
      await request(app)
        .post(`/api/lots/${lot.id}/pause`)
        .set('Authorization', `Bearer ${hostToken}`)

      const res = await request(app)
        .post(`/api/lots/${lot.id}/resume`)
        .set('Authorization', `Bearer ${hostToken}`)

      expect(res.status).toBe(200)
      expect(res.body.lot.auctionStatus).toBe('active')
    })

    it('cannot pause an idle lot', async () => {
      const res = await request(app)
        .post(`/api/lots/${lot.id}/pause`)
        .set('Authorization', `Bearer ${hostToken}`)

      expect(res.status).toBe(400)
    })
  })

  describe('Bid Placement with Wallet', () => {
    beforeEach(async () => {
      const tRes = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Bid Wallet Test',
          shortCode: 'BWT' + Date.now(),
          pursePerFranchise: 50000000,
          settings: { minBidIncrement: 100000 },
          franchises: [
            { name: 'Team A', colorHex: '#000' },
          ],
        })
      tournament = tRes.body.tournament

      // Assign host user as franchise owner (required for paddle raise)
      await request(app)
        .post(`/api/franchises/${tournament.id}/${tournament.franchises[0].id}/members`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ userId: hostUser.id, role: 'owner' })

      const lRes = await request(app)
        .post(`/api/tournaments/${tournament.id}/lots`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Test Player',
          style: 'Batsman',
          country: 'India',
          basePrice: 2000000,
          bidIncrement: 500000,
        })
      lot = lRes.body.lot

      // Activate the lot
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)
    })

    it('allows bid within wallet', async () => {
      const franchise = tournament.franchises[0]

      const res = await request(app)
        .post(`/api/lots/${lot.id}/place-bid`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id, amount: 3000000 })

      expect(res.status).toBe(200)
      expect(res.body.lot.currentBid).toBe(3000000)
      expect(res.body.lot.currentBidderFranchiseId).toBe(franchise.id)
    })

    it('rejects bid exceeding wallet', async () => {
      const franchise = tournament.franchises[0]

      const res = await request(app)
        .post(`/api/lots/${lot.id}/place-bid`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id, amount: 60000000 }) // Over 50M budget

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/insufficient funds/i)
    })

    it('rejects bid below minimum increment', async () => {
      const franchise = tournament.franchises[0]

      // Base price is 2M, bid increment is 500K, so min is 2.5M
      const res = await request(app)
        .post(`/api/lots/${lot.id}/place-bid`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id, amount: 2100000 }) // Below 2.5M

      expect(res.status).toBe(400)
    })
  })

  describe('Hammer with Wallet Deduction', () => {
    beforeEach(async () => {
      const tRes = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Hammer Wallet Test',
          shortCode: 'HWT' + Date.now(),
          pursePerFranchise: 50000000,
          franchises: [{ name: 'Team A', colorHex: '#000' }],
        })
      tournament = tRes.body.tournament

      // Assign host user as franchise owner (required for paddle raise)
      await request(app)
        .post(`/api/franchises/${tournament.id}/${tournament.franchises[0].id}/members`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ userId: hostUser.id, role: 'owner' })

      const lRes = await request(app)
        .post(`/api/tournaments/${tournament.id}/lots`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Expensive Player',
          style: 'Batsman',
          country: 'India',
          basePrice: 5000000,
          bidIncrement: 500000,
        })
      lot = lRes.body.lot

      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)
    })

    it('deducts from franchise wallet on hammer', async () => {
      const franchise = tournament.franchises[0]
      const initialWallet = franchise.wallet.initial

      // Place a bid first
      await request(app)
        .post(`/api/lots/${lot.id}/place-bid`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id, amount: 5000000 })

      // Hammer
      await request(app)
        .post(`/api/lots/${lot.id}/hammer`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id })

      // Check tournament wallet was updated
      const tRes = await request(app)
        .get(`/api/tournaments/${tournament.id}`)
        .set('Authorization', `Bearer ${hostToken}`)

      const updatedFranchise = tRes.body.tournament.franchises.find(f => f.id === franchise.id)
      expect(updatedFranchise.wallet.spent).toBe(5000000)
      expect(updatedFranchise.wallet.initial - updatedFranchise.wallet.spent).toBe(45000000)
    })
  })

  describe('Undo System', () => {
    beforeEach(async () => {
      const tRes = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Undo Test',
          shortCode: 'UDT' + Date.now(),
          pursePerFranchise: 50000000,
          franchises: [{ name: 'Team A', colorHex: '#000' }],
        })
      tournament = tRes.body.tournament

      // Assign host user as franchise owner (required for paddle raise)
      await request(app)
        .post(`/api/franchises/${tournament.id}/${tournament.franchises[0].id}/members`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ userId: hostUser.id, role: 'owner' })

      const lRes = await request(app)
        .post(`/api/tournaments/${tournament.id}/lots`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Undo Player',
          style: 'Bowler',
          country: 'Australia',
          basePrice: 2000000,
          bidIncrement: 500000,
        })
      lot = lRes.body.lot
    })

    it('undoes a bid placement', async () => {
      const franchise = tournament.franchises[0]

      // Activate and place bid
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)
      await request(app)
        .post(`/api/lots/${lot.id}/place-bid`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id, amount: 3000000 })

      // Undo
      const res = await request(app)
        .post(`/api/lots/${lot.id}/undo`)
        .set('Authorization', `Bearer ${hostToken}`)

      expect(res.status).toBe(200)
      expect(res.body.lot.currentBid).toBe(2000000) // Back to basePrice
    })

    it('undoes a hammer and restores wallet', async () => {
      const franchise = tournament.franchises[0]

      // Activate, bid, hammer
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)
      await request(app)
        .post(`/api/lots/${lot.id}/place-bid`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id, amount: 2500000 })
      await request(app)
        .post(`/api/lots/${lot.id}/hammer`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id })

      // Undo
      await request(app)
        .post(`/api/lots/${lot.id}/undo`)
        .set('Authorization', `Bearer ${hostToken}`)

      // Check wallet was restored
      const tRes = await request(app)
        .get(`/api/tournaments/${tournament.id}`)
        .set('Authorization', `Bearer ${hostToken}`)

      const updatedFranchise = tRes.body.tournament.franchises.find(f => f.id === franchise.id)
      expect(updatedFranchise.wallet.spent).toBe(0) // Refunded
    })

    it('returns 400 when nothing to undo', async () => {
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)

      const res = await request(app)
        .post(`/api/lots/${lot.id}/undo`)
        .set('Authorization', `Bearer ${hostToken}`)

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/no actions to undo/i)
    })

    it('non-host cannot undo', async () => {
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)

      const res = await request(app)
        .post(`/api/lots/${lot.id}/undo`)
        .set('Authorization', `Bearer ${viewerToken}`)

      expect(res.status).toBe(403)
    })
  })

  describe('Physical Mode', () => {
    beforeEach(async () => {
      const tRes = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Physical Auction Test',
          shortCode: 'PAT' + Date.now(),
          auctionMode: 'physical',
          pursePerFranchise: 50000000,
          franchises: [{ name: 'Team A', colorHex: '#000' }],
        })
      tournament = tRes.body.tournament

      const lRes = await request(app)
        .post(`/api/tournaments/${tournament.id}/lots`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          name: 'Physical Player',
          style: 'All-rounder',
          country: 'England',
          basePrice: 3000000,
          bidIncrement: 500000,
        })
      lot = lRes.body.lot
    })

    it('host can place bids in physical mode', async () => {
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)

      const franchise = tournament.franchises[0]
      const res = await request(app)
        .post(`/api/lots/${lot.id}/place-bid`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ franchiseId: franchise.id, amount: 4000000 })

      expect(res.status).toBe(200)
    })

    it('viewer cannot place bids in physical mode', async () => {
      await request(app)
        .post(`/api/tournaments/${tournament.id}/lots/${lot.id}/activate`)
        .set('Authorization', `Bearer ${hostToken}`)

      const franchise = tournament.franchises[0]
      const res = await request(app)
        .post(`/api/lots/${lot.id}/place-bid`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ franchiseId: franchise.id, amount: 4000000 })

      expect(res.status).toBe(403)
    })
  })
})