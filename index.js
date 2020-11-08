require('dotenv').config();
const express = require("express");
const { lookup } = require("geoip-lite");
const bodyparser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');

mongoose.connect(process.env.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false })
const app = express();
const client = {};

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(session({ secret: 'PhotoPrint', resave: false, saveUninitialized: false, cookie: { maxAge: 600000 } }))
app.set('view engine', 'ejs')
app.set('views', './views')

const sendMail = require("./mail.js")

const login = require("./login.js")
client.schema = {
    users: require("./mongo/users.js"),
    postBox: require("./mongo/postBox.js"),
    post: require("./mongo/post.js"),
};

function checkAuth(req, res, next) {
    if (!req.session.user.loggedIn) return res.redirect("/login");
    next()
  };

app.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    console.log((req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.ip) + " [" +req.method +"] " + req.url);
    next();
})
app.use((req, res, next) => {
    if (!req.session.user) req.session.user={loggedIn:false};
    next();
});

app.get(`/`, async (req,res) => {
    res.render('index.ejs', {
        error:req.query.error,
        user: req.session.user
    });  
})



app.get('/register', function (req, res) {
    if (req.session.user.loggedIn) return res.redirect("/dashboard")
    res.render('register.ejs', {
        error:req.query.error,
        user: req.session.user
    });  
  });
app.get('/login', function (req, res) {
    console.log(req.session)
    if (req.session.user.loggedIn) return res.redirect("/dashboard")
    res.render('login.ejs', {
        error:req.query.error,
        user: req.session.user
    });  
  });
  app.post('/auth', async function (req, res) {
    console.log(req.body)
    if (!req.body.type) res.status(400).send('no type specified');
    console.log(1)
    login(req, res, client)
    console.log(2)    
  });
  app.get('/dashboard',checkAuth, async function (req, res) {
      console.log(req.session)
    const postBoxes = await client.schema.postBox.find({ ownerID: req.session.user.id });
    res.render('dashboard.ejs', {
        postBoxes,
        error:req.query.error,
        user: req.session.user
    }); 
  });
  app.post('/createPostBox',checkAuth, async function (req, res) {
    console.log(req.body)
    const {redirectURL, name} = req.body;
    if (!redirectURL || !name) res.status(400).send('no type specified');
    await client.schema.postBox.create({ 
        ownerID: req.session.user.id,
        redirectURL,
        name
     });
     res.redirect("/dashboard")
  });
  app.get('/postBox/:id/delete',checkAuth, async function (req, res) {
    const ID = req.params.id
    const data = await client.schema.postBox.findOne({_id: req.params.id})
    if (!data) return;
    if (data.ownerID != req.session.user.id) return;
    await client.schema.postBox.deleteOne({_id: req.params.id})
    await client.schema.post.deleteMany({postBoxID: req.params.id})

    res.redirect("/dashboard?success=deleted")
  });

  app.get('/postBox/:id',checkAuth, async function (req, res) {
    const ID = req.params.id
    const data = await client.schema.post.find({postBoxID: req.params.id});
    console.log(data)
    res.render('post.ejs', {
        post: data,
        error:req.query.error,
        user: req.session.user
    }); 
  });
  
  app.post('/editPostBox',checkAuth, async function (req, res) {
    const {name, redirectURL, id} =  req.body;
    console.log(name, redirectURL, id)
    const data = await client.schema.postBox.findOne({_id: id});
    if (!data) return;
    if (data.ownerID != req.session.user.id) return;
    await client.schema.postBox.updateOne({_id: id},{name, redirectURL});
    return res.redirect("/dashboard");
  });

  app.post('/', async function (req, res) {
    const postMailID = req.body.postMailID;
    console.log(req.body)
    if (!postMailID) return res.status(400).send()
    const data = await client.schema.postBox.findOne({_id: postMailID})
    if (!data) return res.send("no post box found!")
    delete req.body.postMailID;
    await client.schema.post.create({
        postBoxID: postMailID,
        data: req.body,
        time: Date.now()
    });
    const user = await client.schema.users.findOne({_id: data.ownerID})
    sendMail(req.body, user.email)
    res.status(301).redirect("http://"+data.redirectURL)
  });


//insertOne

const port = 3001;
app.listen(port, ()=> {
    console.log(`Listening at  http://localhost:${port}`)
})