import { ObjectId } from 'mongodb';
import { mkdir, writeFile, readFileSync } from 'fs';
import { v4 as uuid } from 'uuid';
import mime from 'mime-types';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const fileQueue = new Queue('fileQueue');
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
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

      // Add the file to the queue
      fileQueue.add({
        userId,
        fileId: doc.insertedId,
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
    const localPath = `${FOLDER_PATH}/${uuid()}`;

    mkdir(FOLDER_PATH, { recursive: true }, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });

    writeFile(localPath, buff, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });

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
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(req.param.id), userId: user._id });
    if (!file) return res.status(404).json({ error: 'Not found' });
    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    // retrive the token from the header
    const token = req.header('X-Token');
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
    const token = req.header('X-Token');
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
    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
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
    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getFile(req, res) {
    const fileId = req.params.id || '';
    const size = req.query.size || 0;

    const file = await dbClient.collection('files').findOne({ _id: ObjectId(fileId) });
    if (!file) return res.status(404).send({ error: 'Not found' });

    const { isPublic, userId, type } = file;

    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });

    if ((!isPublic && !user) || (user && userId.toString() !== user && !isPublic)) return res.status(404).send({ error: 'Not found' });
    if (type === 'folder') return res.status(400).send({ error: 'A folder doesn\'t have content' });

    const path = size === 0 ? file.localPath : `${file.localPath}_${size}`;

    try {
      const fileData = readFileSync(path);
      const mimeType = mime.contentType(file.name);
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileData);
    } catch (err) {
      return res.status(404).send({ error: 'Not found' });
    }
  }
}

export default FilesController;
