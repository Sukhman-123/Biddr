import mongoose from 'mongoose'

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minLength: [2, 'Name must be at least 2 characters'],
      maxLength: [100, 'Name must be under 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      minLength: [7, 'Mobile number must be at least 7 digits'],
    },
    place: {
      type: String,
      required: [true, 'Place / address is required'],
      trim: true,
      minLength: [2, 'Place must be at least 2 characters'],
      maxLength: [200, 'Place must be under 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minLength: [4, 'Message must be at least 4 characters'],
      maxLength: [2000, 'Message must be under 2000 characters'],
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied'],
      default: 'new',
    },
  },
  { timestamps: true },
)

const Contact = mongoose.model('Contact', contactSchema)

export default Contact
