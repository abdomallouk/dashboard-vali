const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer'); 
const fs = require('fs'); 

const {users} = require('./db')

const jwt = require('jsonwebtoken');

const xss = require('xss');

const app = express();

const cookies = require('cookie-parser')

const path = require('path');


app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname+'uploads'))
app.use(cookies())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;
  
    try {
        const verify_token = jwt.verify(token, "cds");
        res.redirect('/dashboard');

    } catch {
        next();
    }
};





app.get('/form', isAuthenticated, (req, res) => {
    res.render('form'); 
});


const  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
})

const  upload = multer({ storage: storage })



function readDBFile() {
    try {
      const data = fs.readFileSync('db.json', 'utf8');
      const parsedData = JSON.parse(data);

      if (!Array.isArray(parsedData)) {
        return [];
      }

      return parsedData;
    } catch (err) {
      return [];
    }
  }



app.post('/submit',upload.single('image'), (req, res) => {

    console.log(req.file)
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } 

    if (! req.body.name) {
        return res.status(400).json({
            error: ' your data is not valid'
        })
    }
  
    const { name, email, password } = req.body;


    const imagePath = `/uploads/${req.file.filename}`; 

    const newUser = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        imagePath, 
    };

    const sanitizedData = {
      name: xss(name),
      email: xss(email),
      password: xss(password),
    };


    const existingData = readDBFile();

    existingData.push(newUser);

    fs.writeFileSync('db.json', JSON.stringify(existingData, null, 2), 'utf8');

    // users.push(newUser);

    res.redirect('/register')

});




app.get('/register', isAuthenticated, (req, res) => {
    res.render('register')
})



app.post('/register', (req, res) => {
    const name  = req.body.name;
    // const password = req.body.password

    const user = readDBFile().find((user) => user.name === name);

    // const user = users.find((u) => u.name === name);
    console.log(user)
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ name: user.name ,image: user.imagePath}, "cds");
    res.cookie("token",token,{
        httpOnly:true
    })
    // return res.status(200).json({ token });
    res.redirect('/dashboard')      
})

const logger = (req,res,next)=>{
    const token = req.cookies.token

    try{
        const verify_token = jwt.verify(token,"cds")
        console.log('token',verify_token)
        const {name,iat,image} = verify_token
        req.name = name
        req.iat = iat
        req.image = image
        next()

    }catch{
        res.status(401).send('invalid token')
    }
}

app.get('/dashboard',logger, (req, res) => {
    const name = req.name;
    const iat = req.iat
    const image = req.image
    console.log(image)
    res.render('dashboard', { name,iat,image });
});





app.get('/users', (req, res) => {
    res.send(readDBFile())
})



app.listen(4000, () => {
  console.log('Server started on port 4000');
});
