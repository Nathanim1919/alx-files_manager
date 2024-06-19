import { MongoClient } from 'mongodb';

const port = process.env.DB_PORT || 27017;
const host = process.env.DB_HOST || 'localhost';
const uri = `mongodb://${host}:${port}/`;
const dbName = process.env.DB_DATABASE || 'file_manager';

class DBClient {
  constructor() {
    this.database = null;
    MongoClient.connect(
      uri,
      { useUnifiedTopology: true },
      (error, client) => {
        if (error) console.log(error);
        this.database = client.db(dbName);
        this.database.createCollection('users');
        this.database.createCollection('files');
      },
    );
  }

  isAlive() {
    return !!this.database;
  }

  async nbUsers() {
    return this.database.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.database.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
