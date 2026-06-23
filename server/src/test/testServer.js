const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

let mongod = null
let originalEnv

async function startTestEnv() {
  if (!originalEnv) originalEnv = { ...process.env }
  mongod = await MongoMemoryServer.create()
  process.env.JWT_SECRET = 'test-jwt-secret-12345'
  process.env.CLIENT_URL = 'http://localhost:5173'
  process.env.MONGO_URI = mongod.getUri()
  const app = require('../index')
  const connectDB = require('../config/db')
  await connectDB()
  return app
}

async function stopTestEnv() {
  // Drop the mongoose connection and stop the in-memory server
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (mongod) {
    await mongod.stop()
    mongod = null
  }
  if (originalEnv) {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      process.env[key] = value
    }
    originalEnv = null
  }
}

async function clearDatabase() {
  for (const name of Object.keys(mongoose.connection.collections)) {
    await mongoose.connection.collections[name].deleteMany({})
  }
}

let phoneCounter = 0

async function registerUser(app, { fullName, email, password, phone }) {
  const request = require('supertest')
  const finalPhone = phone ?? `+1555${String(phoneCounter++).padStart(7, '0')}`
  const res = await request(app)
    .post('/api/auth/register')
    .send({ fullName, email, password, phone: finalPhone })
  return res
}

async function loginUser(app, { email, identifier, password }) {
  const request = require('supertest')
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: identifier ?? email, password })
  return res
}

module.exports = {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
  registerUser,
  loginUser,
}
