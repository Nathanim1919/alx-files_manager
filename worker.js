import Bull from 'bull';
import { ObjectId } from 'mongodb';
import imagetThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue');
const userFileQueue = new Bull('userFileQueue');

const createImageThumbnail = async (path, options) => {
  try {
    const thumbnail = await imagetThumbnail(path, options);
    const thumbnailPath = `${path}_${options.width}`;

    await fs.writeFileSync(thumbnailPath, thumbnail);
  } catch (error) {
    console.log(error);
    return null;
  }
};

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });

  if (!file) {
    throw new Error('File not found');
  }

  createImageThumbnail(file.localPath, { width: 500 });
  createImageThumbnail(file.localPath, { width: 250 });
  createImageThumbnail(file.localPath, { width: 100 });
});

  userFileQueue.process(async (job) => {
    const { userId } = job.data;
    if (!userId) throw Error('Missing userId');
  
    const userDocument = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!userDocument) throw Error('User not found');
  
    console.log(`Welcome ${userDocument.email}`);
  });
