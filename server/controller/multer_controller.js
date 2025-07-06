import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { paperID } = req.body;
    if (paperID) {
      const folderPath = path.join('uploads', paperID);
      // Create folder if it doesn't exist
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      cb(null, folderPath);
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: (req, file, cb) => {
    const { paperID } = req.body;
    if (paperID) {
      // Check file type and name accordingly
      if (file.fieldname === 'quePaperFile') {
        cb(null, 'question_paper' + path.extname(file.originalname));
      } else if (file.fieldname === 'ansKeyFile') {
        cb(null, 'ans_key' + path.extname(file.originalname));
      } else {
        cb(null, file.originalname);
      }
    } else {
      cb(null, file.originalname);
    }
  }
});

// Configure multer without file type restrictions or size limits
const upload = multer({
  storage: storage
});

// Controller function for upload
export const uploadFiles = (req, res) => {
  try {
    console.log('=== Upload Request Debug ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
    
    // Get the data from the request body
    const { paperID } = req.body;
    
    // Check if required paperID is present
    if (!paperID) {
      console.log('Missing paperID in request');
      return res.status(400).json({ 
        success: false,
        message: 'paperID is required',
        receivedData: { paperID }
      });
    }

    // Check if at least one file was uploaded
    if (!req.files || (Object.keys(req.files).length === 0)) {
      console.log('No files found in request');
      return res.status(400).json({
        success: false,
        message: 'No files were uploaded'
      });
    }

    // Check what files were uploaded
    // When using upload.fields(), files are stored as an object with field names as keys
    const quePaperFile = req.files?.quePaperFile?.[0];
    const ansKeyFile = req.files?.ansKeyFile?.[0];

    // Process the uploaded files
    const fileInfo = {
      paperID: paperID,
      quePaperFile: quePaperFile ? {
        filename: quePaperFile.filename,
        originalname: quePaperFile.originalname,
        size: quePaperFile.size,
        path: quePaperFile.path
      } : null,
      ansKeyFile: ansKeyFile ? {
        filename: ansKeyFile.filename,
        originalname: ansKeyFile.originalname,
        size: ansKeyFile.size,
        path: ansKeyFile.path
      } : null,
      uploadDate: new Date().toISOString()
    };

    // Log the upload details
    console.log('Received upload request:', { paperID });
    console.log('Files uploaded:', {
      quePaperFile: !!quePaperFile,
      ansKeyFile: !!ansKeyFile
    });
    console.log('File info:', fileInfo);

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: fileInfo
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'File upload failed', 
      details: error.message 
    });
  }
};

// Export multer instance for use in routes
export { upload };

// Controller function to delete paper folder and its contents
export const deletePaperFolder = (req, res) => {
  try {
    console.log('=== Delete Request Debug ===');
    console.log('Request body:', req.body);
    
    const { paperID } = req.body;
    
    // Check if required paperID is present
    if (!paperID) {
      console.log('Missing paperID in request');
      return res.status(400).json({ 
        success: false,
        message: 'paperID is required',
        receivedData: { paperID }
      });
    }

    const folderPath = path.join('uploads', paperID);
    
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      console.log(`Folder not found: ${folderPath}`);
      return res.status(404).json({
        success: false,
        message: `Paper folder with ID '${paperID}' not found`
      });
    }

    // Delete folder and all its contents recursively
    fs.rmSync(folderPath, { recursive: true, force: true });
    
    console.log(`Successfully deleted folder: ${folderPath}`);

    res.json({
      success: true,
      message: `Paper folder with ID '${paperID}' deleted successfully`,
      deletedPath: folderPath
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete paper folder', 
      details: error.message 
    });
  }
};
