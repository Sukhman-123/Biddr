const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGO_URI is missing. Set it in server/config.env for local dev, ' +
        'or in the Render dashboard (Environment tab) for production.',
    );
  }

  // Tight timeout so we fail fast on misconfiguration instead of hanging
  // the deploy for 30+ seconds (Render's free tier kills long-starting
  // services).
  const connection = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`MongoDB connected: ${connection.connection.host}`);
};

module.exports = connectDB;
