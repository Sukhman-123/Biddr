import { Router } from 'express'
import { submitContact } from '../controllers/contact.controller.js'

const router = Router()

// POST /api/contact — public endpoint, no auth required
router.post('/', submitContact)

export default router
