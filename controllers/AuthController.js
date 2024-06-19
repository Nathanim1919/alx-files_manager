import sha1 from 'sha1';
import { v4 as uuid } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getconnect(req, res) {
    const authorization = req.header('Authorization');
    if (!authorization) return res.status(401).json({ error: 'Unauthorized' });
    const base64Credentials = authorization.split(' ')[1];
    if (!base64Credentials) return res.status(401).json({ error: 'Unauthorized' });
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'utf-8',
    );
    if (!credentials) return res.status(401).json({ error: 'Unauthorized' });
    const [email, password] = credentials.split(':');
    if (!email || !password) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ email, password: sha1(password) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const token = uuid();
    await redisClient.set(`auth_${token}`, user._id.toString(), 86400);
    return res.status(200).json({ token });
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    console.log('User-Id: ', userId);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    return res.status(200).json({ id: user._id, email: user.email });
  }

  static async getdisconnect(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await redisClient.del(`auth_${token}`);
    return res.status(204).end();
  }
}

export default AuthController;
