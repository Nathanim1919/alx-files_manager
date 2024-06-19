import mongodb from 'mongodb';

class DBClient {
  constructor() {
    const uri = `mongodb://${process.env.DB_HOST || 'localhost'}:${
      process.env.DB_PORT || 27017
    }`;
    const dbName = process.env.DB_DATABASE || 'file_manager';

    this.client = new mongodb.MongoClient(uri, { useUnifiedTopology: true });

    this.database = null;
    this.client
      .connect()
      .then((client) => {
        this.database = client.db(dbName);
        this.database.createCollection('users');
        this.database.createCollection('files');
      })
      .catch((err) => {
        console.log('Failed to connect to MongoDB ', err.message);
      });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const usersCollection = this.database.collection('users');
    return usersCollection.countDocuments();
  }

  async nbFiles() {
    const filesCollection = this.database.collection('files');
    return filesCollection.countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
