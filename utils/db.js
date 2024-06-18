import mongoose from "mongoose";
class DBClient {
  constructor() {
    this.client = mongoose.connect({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 27017,
      database: process.env.DB_DATABASE || "file_manager",
    });
  }

  isAlive() {
    return this.client.readyState === 1;
  }

  async nbUsers() {
    return this.client.users.count();
  }

  async nbFiles() {
    return this.client.files.count();
  }
}

const dbClient = new DBClient();
export default dbClient;
