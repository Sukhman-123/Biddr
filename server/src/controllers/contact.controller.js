import Contact from '../models/Contact.js'

// POST /api/contact
export const submitContact = async (req, res) => {
  const { name, email, mobile, place, message } = req.body

  // Basic server-side validation (frontend already validates, but double-check here)
  const errors = []
  if (!name || name.trim().length < 2)
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' })
  if (!email || !/^\S+@\S+\.\S+$/.test(email.trim()))
    errors.push({ field: 'email', message: 'Please provide a valid email address' })
  if (!mobile || mobile.replace(/\D/g, '').length < 7)
    errors.push({ field: 'mobile', message: 'Please provide a valid mobile number' })
  if (!place || place.trim().length < 2)
    errors.push({ field: 'place', message: 'Place must be at least 2 characters' })
  if (!message || message.trim().length < 4)
    errors.push({ field: 'message', message: 'Message must be at least 4 characters' })

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    })
  }

  try {
    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      place: place.trim(),
      message: message.trim(),
    })

    return res.status(201).json({
      success: true,
      message: 'Contact submission received successfully',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        createdAt: contact.createdAt,
      },
    })
  } catch (err) {
    console.error('[contact.controller] submitContact error:', err)
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    })
  }
}
