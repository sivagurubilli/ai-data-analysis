const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const userController = require("../controller/UserController");

const uploadDir = path.join(__dirname, '..', 'uploads'); // adjust path as needed

// Ensure the uploads folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

router.post("/v1/users/upload-file", upload.single('file'), userController.addDetails);
router.get("/v1/users/get-data", userController.getDetails);
router.post("/v1/users/get-data-from-ai", userController.getDatafromai);


module.exports = router;
