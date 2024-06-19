import express from 'express';
import AppController from '../controllers/AppController';
import UserController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UserController.postNew);
router.get('/connect', AuthController.getconnect);
router.get('/disconnect', AuthController.getdisconnect);
router.get('/users/me', AuthController.getMe);
router.post('/files', FilesController.postUpload);

export default router;
