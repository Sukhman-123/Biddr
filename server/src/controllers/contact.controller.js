const Contact = require('../models/Contact');
const { sendContactNotificationEmail } = require('../services/email');

const normalizeText = (value) =>
  typeof value === 'string' ? value.trim() : '';

const validateContact = ({ name, email, mobile, place, message }) => {
  const errors = [];

  if (name.length < 2 || name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters' });
  }
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }
  if (mobile.replace(/\D/g, '').length < 7 || mobile.length > 30) {
    errors.push({ field: 'mobile', message: 'Please provide a valid mobile number' });
  }
  if (place.length < 2 || place.length > 200) {
    errors.push({ field: 'place', message: 'Place must be between 2 and 200 characters' });
  }
  if (message.length < 4 || message.length > 2000) {
    errors.push({ field: 'message', message: 'Message must be between 4 and 2000 characters' });
  }

  return errors;
};

// POST /api/contact
const submitContact = async (req, res) => {
  const submission = {
    name: normalizeText(req.body?.name),
    email: normalizeText(req.body?.email).toLowerCase(),
    mobile: normalizeText(req.body?.mobile),
    place: normalizeText(req.body?.place),
    message: normalizeText(req.body?.message),
  };
  const errors = validateContact(submission);

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  try {
    const contact = await Contact.create(submission);
    let notificationStatus = 'pending';

    try {
      const delivery = await sendContactNotificationEmail(contact.toObject());
      notificationStatus = delivery?.skipped ? 'skipped' : 'sent';
    } catch (error) {
      notificationStatus = 'failed';
      console.error('[contact.controller] notification error:', error.message);
    }

    contact.notificationStatus = notificationStatus;
    contact.notificationAttemptedAt = new Date();
    await contact.save();

    const deliveryFailed = notificationStatus === 'failed';

    return res.status(deliveryFailed ? 202 : 201).json({
      success: true,
      message: deliveryFailed
        ? 'Your message was saved, but we could not notify the team right now. Please use the email or phone number shown on this page if your request is urgent.'
        : 'Thanks — your message has been received. We will get back to you shortly.',
      data: {
        id: contact._id,
        createdAt: contact.createdAt,
        notificationStatus,
      },
    });
  } catch (err) {
    console.error('[contact.controller] submitContact error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
};

module.exports = { submitContact, validateContact };
