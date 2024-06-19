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
    if (!base64Credentials) return res.status(401).json({ error: 'Unautherized' });
    const userId = await redisClient.get(`auth_${base64Credentials}`);
    if (!userId) return res.status(401).json({ error: 'Unautherized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unautherized' });

    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type) return res.status(400).json({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });

    const findParentId = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(parentId) });
    if (parentId) {
      if (!findParentId) return res.status(400).json({ error: 'Parent not found' });
      if (findParentId.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    if (type === 'folder') {
      const doc = await dbClient.db.collection('files').insertOne({
        name,
        type,
        parentId,
        data,
        isPublic,
        owner: userId,
      });

      return res.status(201).json({
        doc,
      });
    }
    const buff = Buffer.from(data, 'base64');

    await fsPromises.mkdir(FOLDER_PATH, { recursive: true });

    // create a local path in the storing folder with filename a UUID
    const localPath = `${FOLDER_PATH}/${uuid()}`;
    try {
      await fsPromises.writeFile(localPath, buff);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    const doc = await dbClient.db.collection('files').insertOne({
      name,
      type,
      parentId: parentId || 0,
      isPublic,
      userId,
      localPath,
    });

    return res.status(201).json({
      doc,
    });
  }
}

export default FilesController;
