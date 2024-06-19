import { ObjectId } from 'mongodb';
import { promises as fsPromises } from 'fs';
import { v4 as uuid } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const authorization = req.header('X-Token');
    if (!authorization) return res.status(401).json({ error: 'Unauthorized' });
    const base64Credentials = authorization.split(' ')[0];
    console.log(base64Credentials);
    if (!base64Credentials) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${base64Credentials}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name, type, parentId = '0', isPublic = false, data,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });

    if (parentId !== '0') {
      const parent = await dbClient.db
        .collection('files')
        .findOne({ _id: ObjectId(parentId) });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    if (type === 'folder') {
      const doc = await dbClient.db.collection('files').insertOne({
        name,
        type,
        parentId,
        isPublic,
        userId,
      });

      return res.status(201).json({
        id: doc.insertedId,
        name,
        type,
        parentId,
        isPublic,
        userId,
      });
    }

    const buff = Buffer.from(data, 'base64');
    await fsPromises.mkdir(FOLDER_PATH, { recursive: true });

    const localPath = `${FOLDER_PATH}/${uuid()}`;
    try {
      await fsPromises.writeFile(localPath, buff);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    const doc = await dbClient.db.collection('files').insertOne({
      name,
      type,
      parentId: parentId || '0',
      isPublic,
      userId,
      localPath,
    });

    return res.status(201).json({
      id: doc.insertedId,
      name,
      type,
      parentId: parentId || '0',
      isPublic,
      userId,
      localPath,
    });
  }
}

export default FilesController;
