const multer = require("multer")
const path = require("path")


const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb3) => {
      cb3(null, Date.now() + path.extname(file.originalname));
    },
  }),
});


module.exports = upload;