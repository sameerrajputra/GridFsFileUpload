const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

// Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files. It is written on top of busboy for maximum efficiency.
// NOTE: Multer will not process any form which is not multipart (multipart/form-data).

// GridFS storage engine for Multer to store uploaded files directly to MongoDb.

// Easily stream files to and from MongoDB GridFS.

// method-overiride Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it.

const app = express();

//MIddleware
app.use(bodyParser.json());
app.use(methodOverride('_method')); //telling it that we want to use query string when we make delete request

app.set('view engine', 'ejs');

//mongo URI
const mongoURI = 'mongodb://localhost:27017/gridfs';

//Create mongo connection
mongoose.Promise = global.Promise;
const conn = mongoose.createConnection(mongoURI);
// mongoose.connect(mongoURI, {
// 	useNewURLParser: true
// });

// Init gridfs
let gfs;

// when the database is loaded set the gfs to grid
conn.once('open', () => {
	//init stream
	gfs = Grid(conn.db, mongoose.mongo);
	gfs.collection('uploads');
})

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads' //bucketName should match the collection above
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// @route GET /
// @desc Loads from
app.get('/', (req, res) => {
	  gfs.files.find().toArray((err, files) => {
    // Check if files
    if(!files || files.length === 0) {
      res.render('index', {files: false});
    } else {
      files.map(file => {
        if(file.contentType === 'image/jpeg' || file.contentType === "image/png") {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('index', {files: files});
    }
  });
})

// @ROUTE post /UPLOAD
// @desc uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
	console.log({file: req.file})
	// res.json({file: req.file});
  res.redirect('/');
});

// @route GET /files
// @desc Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if(!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });

    }
          // Files exist
      return res.json(files);
  });
});

// @route GET /files/:filename
// @desc Display single file in JSON
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
     if(!file) {
      return res.status(404).json({
        err: 'No file exist'
      });
  }

  // FIle exist
  return res.json(file);
  });
});


// @route GET /image/:filename
// @desc Display image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
     if(!file) {
      return res.status(404).json({
        err: 'No file exist'
      });
  }

  // check if image
  if(file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
    //Read output to browser
    const readstream = gfs.createReadStream(file.filename);
    readstream.pipe(res);
  } else {
    res.status(404).json({
      err: 'Not an image'
    });
  }
  
  });
});

// @route DELETE /files/:id
// @desc Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridStore) => {
    if(err) {
      return res.status(404).json({ err: err });
    }
    res.redirect('/');
  });
})


const port = 5000;

app.listen(port, () => {
	console.log(`Server started on port ${port}`);
})