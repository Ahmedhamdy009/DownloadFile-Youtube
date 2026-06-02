import { Router } from 'express';
import { fetchInfo, startDownload, serveFile } from '../controllers/downloadController';

const router = Router();

router.post('/info', fetchInfo);
router.post('/download', startDownload);
router.get('/files/:id', serveFile);

export default router;
