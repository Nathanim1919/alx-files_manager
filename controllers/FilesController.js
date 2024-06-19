import { ObjectId } from 'mongodb';
import { promises as fsPromises } from 'fs';
import { v4 as uuid } from 'uuid';
import mime from 'mime-types';
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

  static async getShow(req, res) {
    const authorization = req.header('X-Token');
    if (!authorization) return res.status(401).json({ error: 'Unauthorized' });
    const token = authorization.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: req.param.id, userId: user._id });
    if (!file) return res.status(404).json({ error: 'Not found' });
    return file;
  }

  static async getIndex(req, res) {
    // retrive the token from the header
    const authorization = req.header('X-Token');
    if (!authorization) return res.status(401).json({ error: 'Unauthorized' });
    const token = authorization.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    // Based on the query parameters parentId and page, return the list of file document
    const parentId = req.query.parentId || '0';
    const page = req.query.page || 0;

    const files = await dbClient.db
      .collection('files')
      .find({ parentId, userId: user._id })
      .skip(page * 20)
      .limit(20)
      .toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const authorization = req.header('X-Token');
    if (!authorization) return res.status(401).json({ error: 'Unauthorized' });
    const token = authorization.split(' ')[0];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: req.param.id, userId: user._id });
    if (!file) return res.status(404).json({ error: 'Not found' });
    await dbClient.db
      .collection('files')
      .updateOne({ _id: req.param.id }, { $set: { isPublic: true } });
    return res
      .status(200)
      .json({ id: file._id, name: file.name, isPublic: true });
  }

  static async putUnpublish(req, res) {
    const authorization = req.header('X-Token');
    if (!authorization) return res.status(401).json({ error: 'Unauthorized' });
    const token = authorization.split(' ')[0];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: req.param.id, userId: user._id });
    if (!file) return res.status(404).json({ error: 'Not found' });
    await dbClient.db
      .collection('files')
      .updateOne({ _id: req.param.id }, { $set: { isPublic: false } });
    return res
      .status(200)
      .json({ id: file._id, name: file.name, isPublic: false });
  }

  static async getFile(req, res) {
    const authorization = req.header('X-Token');
    if (!authorization) return res.status(401).json({ error: 'Unauthorized' });
    const token = authorization.split(' ')[0];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: req.param.id });
    if (!file) return res.status(404).json({ error: 'Not found' });
    if (!file.isPublic && file.userId !== user._id) return res.status(404).json({ error: 'Not found' });
    if (file.type === 'folder') return res.status(400).json({ error: "A folder doesn't have content" });
    if (!file.localPath) return res.status(404).json({ error: 'Not found' });

    const mimeType = mime.lookup(file.name);
    res.setHeader('Content-Type', mimeType);
    return res.sendFile(file.localPath);
  }
}

export default FilesController;
