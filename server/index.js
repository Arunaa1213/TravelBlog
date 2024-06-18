const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./model/users');
const Post = require('./model/post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({dest: 'uploads/'});
const fs = require('fs');


app.use(cors({credentials: true, origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

const salt = bcrypt.genSaltSync(10);
const secret = 'qwerfcbvhnjklpwsdfxcvghu';

mongoose.connect('mongodb://arunaasureshkumar:HKdtS8eWYIgzaBkL@ac-of3edha-shard-00-00.fc3ba5l.mongodb.net:27017,ac-of3edha-shard-00-01.fc3ba5l.mongodb.net:27017,ac-of3edha-shard-00-02.fc3ba5l.mongodb.net:27017/?ssl=true&replicaSet=atlas-oic6lz-shard-0&authSource=admin&retryWrites=true&w=majority&appName=TravelblogUsers', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

app.post('/register', async (req, res) => {
    const {email, password} = req.body;
    try {
        const userDoc = await User.create({
            email, 
            password : bcrypt.hashSync(password , salt),
        });
        res.json(userDoc);
    } catch (error) {
        res.status(500).json({message: 'Error registering user', error});
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        console.log('inside try');
        const userDoc = await User.findOne({ email });
        if (!userDoc) {
            console.log('EMAIL NOT FOUND');
            return res.status(400).json('Wrong Credentials');
        }
        
        console.log('Stored hashed password:',password, userDoc.password);
        const passok = bcrypt.compareSync(password, userDoc.password);
        console.log('Password comparison result:', passok);

        if (passok) {
            console.log('logged in');
            jwt.sign({ email, id: userDoc._id }, secret, {}, (err, token) => {
                if (err) {
                    res.status(500).json('Error signing token');
                    return;
                }
                res.cookie('token', token).json({
                    id:userDoc._id,
                    email,
                });
            });
        } else {
            res.status(400).json('Wrong password Credentials');
        }
    } catch (error) {
        console.error('Error logging user:', error);
        res.status(500).json({ message: 'Error logging user', error });
    }
});

app.post('/profile', (req, res) => {
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, (err,info) => {
        if(err) throw err;
        res.json(info);
    })
    res.json(req.cookies)
})

app.post('/logout', (req, res) => {
    res.cookie('token', '').json('ok');
})

app.post('/createNew', uploadMiddleware.single('files'), (req, res) => {
    try {
        const { originalname, path: tempPath } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        const newPath = tempPath + '.' + ext;
        fs.renameSync(tempPath, newPath);

        const {token} = req.cookies;
        jwt.verify(token, secret, {}, async (err,info) => {
            if(err) throw err;
            res.json(info);
            const { title, summary, content } = req.body;
            const postDoc = await Post.create({
                title,
                summary,
                content,
                cover: newPath,
                author: info.id,
            });
        })

        res.json('ok');
    } catch (error) {
        res.status(500).json({ message: 'Error creating post', error });
    }
});

app.get('/post', async (req, res) => {
    res.json(await Post.find()
        .populate('author', ['email']
    ));
})

app.get('/post/:id', async(req, res) => {
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author', ['email']);
    res.json(postDoc);
})

app.put('/post', uploadMiddleware.single('files'), (req, res) => {
    let newPath = null
    if(req.file){
        const { originalname, path: tempPath } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = tempPath + '.' + ext;
        fs.renameSync(tempPath, newPath);
    }
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async (err,info) => {
        if(err) throw err;
        const {id, title, summary, content} = req.body;
        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        if(!isAuthor){
            return res.status(400).json('You are not author');
        }
        await postDoc.updateOne({
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover,
        })
        res.json(postDoc);
        // const { title, summary, content } = req.body;
        // const postDoc = await Post.create({
        //     title,
        //     summary,
        //     content,
        //     cover: newPath,
        //     author: info.id,
        // });
    })
})
app.listen(4000, () => {
    console.log('Server is running on port 4000');
});


// const express = require('express');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const User = require('./model/users');
// const app = express();

// app.use(cors());
// app.use(express.json());

// // const mongoUri = 'mongodb+srv://travelblogusers.fc3ba5l.mongodb.net/';
// // mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
// //     .then(() => console.log('MongoDB connected...'))
// //     .catch(err => console.error('MongoDB connection error:', err));

//     var mongoUrl = 'mongodb+srv://arunaasureshkumar:HKdtS8eWYIgzaBkL@travelblogusers.fc3ba5l.mongodb.net/?retryWrites=true&w=majority&appName=TravelblogUsers';

    
//     mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => {
//         console.log('Connected to MongoDB:', mongoUri);
//     })
//     .catch((err) => {
//         console.error('MongoDB connection error:', err);
//     });
// app.post('/register', async (req, res) => {
//     console.log(req.body);
//     const { email, password } = req.body;
//     try {
//         const userDoc = await User.create({ email, password });
//         res.status(201).json(userDoc);
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// });

// app.listen(4000, () => {
//     console.log('Server running on port 4000');
// });
