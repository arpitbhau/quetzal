// radhe radhe

import express from 'express';
import { uploadFiles, upload } from '../controller/multer_controller.js';
import { deletePaperFolder } from '../controller/multer_controller.js';

const router = express.Router();

// Upload files with paperID folder structure
// Expects: { paperID: "string" } + quePaperFile and/or ansKeyFile in form data
router.post('/upload', upload.fields([
  { name: 'quePaperFile', maxCount: 1 },
  { name: 'ansKeyFile', maxCount: 1 }
]), uploadFiles);

// Delete paper folder and its contents
// Expects: { paperID: "string" }
router.post('/del', deletePaperFolder);

export default router;
