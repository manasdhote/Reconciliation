import mongoose from 'mongoose';
import { MONGO_URI } from '../config';

const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
