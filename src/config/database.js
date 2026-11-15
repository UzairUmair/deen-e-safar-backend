import mongoose from 'mongoose';
export async function connectDatabase(uri) {
  const connection = await mongoose.createConnection(uri, {
    dbName: 'deen_e_safar', serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000,
    socketTimeoutMS: 20000, maxPoolSize: 10, minPoolSize: 0, bufferCommands: false,
  }).asPromise();
  return connection;
}
