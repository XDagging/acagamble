require('dotenv').config()
const express = require("express");
const mongoose = require("mongoose")
const fs = require("fs")
const Cryptr = require('cryptr');
const session = require("express-session");
const MemoryStore = require('memorystore')(session)
const cors = require("cors")
const bodyParser = require("body-parser");
const app = express();
const { v4: uuidv4 } = require('uuid');
const https = require("https")
const axios = require("axios");
const md5 = require("md5")
const qs = require('qs');

const cheerio = require('cheerio');
const saltRounds = 10;
const {doEverything} = require("./studentvue.js")



const cmod = new Cryptr(process.env.SECRET, { encoding: 'base64', pbkdf2Iterations: 10000, saltLength: 20 });


app.use(session({
    secret: process.env.COOKIESECRET,
    cookie: {
        path: "/",
        maxAge: 2628000000,
        httpOnly: true , // This is because i want to track if the cookie changes so i can change accordingly.
        sameSite: "none",
        secure: true, // Set the Secure attribute
    },
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
    }), 
}));

function authenticateUser(req) {

    return new Promise((resolve) => {
        let sessionId = req.sessionID;

        if (!sessionId) {
            resolve("No user found");
        } else {
            req.sessionStore.get(sessionId, (err, session) => {
                if (err) {
                    console.log(err);
                    resolve("No user found");
                } else {
                    if (!session) {
                        resolve("No user found");
                    } else {
                        const currentUser = session.user;
                        if (!currentUser) {
                            resolve("No user found");
                        } else {
                            resolve(currentUser);
                        }
                    }
                }
            });
        }
    });
}


app.use(cors({
    origin: "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
}))
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    // Remove this line once done with production
    rejectUnauthorized: false
};

const server = https.createServer(options, app);


mongoose.connect("mongodb://localhost:27017/hackathonDB")


const userSchema = new mongoose.Schema({
    uuid: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        unique: false,
    },
    studentId: {
        type: String,
        unique: true,
        index: true,
    }, 
    password: {
        type: String,
        unique: false
    },
    passwordHash: {
        type: String,
        unique: false,
    },
    email: {
        type: String,
        unique: true,
    },
    emailHash: {
        type: String,
        unique: true,
    },
    tokens: {
        type: Number,
        unique: false,
    },
    activeBets: {
        type: Array,
        unique: false,
    },
    schedule: {
        type: Array,
        unique: false,
    }
      
})


const betSchema = new mongoose.Schema({
    isActive: {
        type: Boolean,
        unique: false,
    },
    name: {
        type: String,
        unique: false
    }, 
    uuid: {
        type: String,
        unique: false,
    },
    percentage: {
        type: String,
        unique: false,
    },
    school: {
        type: String,
        unique: false,
    },
    gpa: {
        type:String,
        unique: false,
    },
    wagerAmount: {
        type: Number,
        unique: false
    },
    gambleTo: {
        type: String,
        unique: false,
    },
    betId: {
        type: String,
        unique: false,
    }
})



const Bet = new mongoose.model("Bet", betSchema)
const User = new mongoose.model("User", userSchema)

app.use(bodyParser.json({limit: "10mb"}))
app.post("/signup", async (req,res) => {
    try {
        const {password, studentId, email} = req.body;



        if (password && studentId && email) {

            // Only supports mcps
            const endpoint = "https://md-mcps-psv.edupoint.com"




            await doEverything(endpoint, password, studentId).then((stuff) => {
                
                User.findOne({studentId: studentId}).then((user,err) => {
                    if (err) {
                        console.log(err)
                        res.status(400).send(JSON.stringify({
                            code: "err",
                            message: "invalid request"
                        }))
                    } else {
                        if (user === null) {
                            const userUuid = uuidv4()
                            const newUser = new User({
                                uuid: userUuid,
                                schedule: stuff.initialGrades,
                                name: cmod.encrypt(stuff.name),
                                activeBets: [],
                                studentId: studentId,
                                password: cmod.encrypt(password),
                                passwordHash: md5(password),
                                emailHash: md5(email),
                                email: cmod.encrypt(email),
                                tokens: 0,

                            
                                
                            })

                            

                            newUser.save().then(() => {
                                req.session.user = userUuid;
                                
                                res.status(200).send(JSON.stringify({
                                    code: "ok",
                                    message: "success"
                                }
                                ))
                            })

                            

                        } else {
                            res.status(400).send(JSON.stringify({
                                code: "err",
                                message: "already exists"
                            }))
                        }
                    }
                })




                console.log(stuff)
            })
        } else {
            res.status(400).send(JSON.stringify({
                code: "err",
                message: "invalid request"
            }))
        }


    } catch(e) {
        console.log(e)
        res.status(400).send(JSON.stringify({
            code: "err",
            message: 'invalid request'
        }))
    }



})

app.post("/login", (req,res) => {
    try {
        const {email, password} = req.body;
        

        User.findOne({emailHash: md5(email), passwordHash: md5(password)}).then((user,err) => {
            if (err) {
                console.log(err)
                res.status(400).send(JSON.stringify({code: "err", message: "invalid request"}))
            } else {
                if (user !== null) {

                    
                    req.session.user = user.uuid
                    console.log(req.session.user)
                    authenticateUser(req).then((id) => {
                        console.log(id)
                    })
                    res.status(200).send(JSON.stringify({
                        code: "ok",
                        message: "success"
                    }))
                } else {
                    res.status(200).send(JSON.stringify({
                        code: "err",
                        message: "user not found"
                    }))
                }
            }
        })







    } catch(e) {
        console.log(e)
        res.status(400).send(JSON.stringify({
            code: "err",
            message: "invalid request"
        }))
    }





})

app.get("/getUser", (req,res) => {
        authenticateUser(req).then((id) => {
            if (id === "No user found") {
                console.log("err")
                res.status(400).send(JSON.stringify({
                    code: "err",
                    message: "invalid request"
                }))
            } else {
                User.findOne({uuid: id}).then((user,err) => {
                    if (err){
                        console.log(err)
                        res.status(JSON.stringify({
                            code: "err",
                            message: "invalid request"
                        }))
                    } else {
                        let decryptedUser = {
                            name: cmod.decrypt(user.name),
                            studentId: user.studentId,
                            schedule: user.schedule,
                            activeBets: user.activeBets,
                            tokens: user.tokens
                        }

                        
                        

                        res.status(200).send(JSON.stringify({
                            code: "ok",
                            message: decryptedUser


                        }))


                    }
                } )
            }
        })
    }
)

app.post("/makeBetListing", (req,res) => {
    authenticateUser(req).then((id) => {
        if (id === "No user found") {
            res.status(400).send(JSON.stringify({
                code: "err",
                message: "invalid request 1"
            }))
        } else {
            User.findOne({uuid: id}).then((user,err) => {
                if (err) {
                    console.log(err);
                    res.status(400).send(JSON.stringify({
                        code: "err",
                        message: "invalid request 2"
                    }))
                } else {
                    if (user !== null) {
                        
                        const {gambleTo, period, wagerAmount} = req.body;



                        if (wagerAmount > user.tokens) {
                            res.status(400).send(JSON.stringify({
                                code: "err",
                                message: "you don't have enough tokens"
                            }))
                        } else {    

                            if (gambleTo && period) {
                                    console.log(user.activeBets)

                                const newBet = new Bet({
                                    isActive: true,
                                    name: user.name,
                                    uuid: user.uuid,
                                    percentage: user.activeBets[period].grade,
                                    school: "Walter Johnson",
                                    gpa: Math.floor(4.00 - (Math.random().toFixed(2))),
                                    wagerAmount: wagerAmount,
                                    gambleTo: gambleTo,
                                    betId: uuidv4()

                                })

                                newBet.save()
                                res.status(200).send(JSON.stringify({
                                    code: "ok",
                                    message: "yur"
                                }))




                            } else {
                                res.status(400).send(JSON.stringify({
                                    code: 'err',
                                    message: 'invalid request'
                                }))
                            }



                        }

                        




                    } else {
                        res.status(400).send(JSON.stringify({
                            code: "err",
                            message: "invalid request"
                        }
                        ))
                    }
                }
            })
        }
    })
})


app.get("/getDashboard", (req,res) => {
    authenticateUser(req).then((id) => {
        if (id === "No user found") {
            res.status(400).send(JSON.stringify({
                code: "err",
                message: "invalid request"
            }))
        } else {
            User.findOne({uuid: id}).then((user,err) => {
                if (err) {
                    console.log(err) 
                    res.status(400).send(JSON.stringify({
                        code: "err",
                        message: "invalid request"
                    }))
                } else {
                    if (user !== null) {
                        Bet.find({}).then((list,err) => {
                            if (err) {
                                console.log(err)
                            } else {
                                let goodList = []
                                list.map((item) => {
                                    goodList.push({
                                        name: cmod.decrypt(item.name),
                                        uuid: item.uuid,
                                        percentage: item.percentage,
                                        school: item.school,
                                        gpa: item.gpa,
                                        gambleTo: item.gambleTo
                                    })
                                })
                                res.status(200).send(JSON.stringify({
                                    code: "ok",
                                    message: goodList,
                                }))
                            }
                        })

                    }
                }
            })
        }
    })
})


app.post('/acceptbet', (req,res) => {
    
    authenticateUser(req).then((id) => {
        if (id === "No user found") {
            res.status(400).send(JSON.stringify({
                code: "err",
                message: "invalid request"
            }))
        } else {


            const {betId, name, maxWin, wagerAmount, school, currentPercentage, gambleTo} = req.body;

            Bet.findOneAndUpdate({betId: betId}, {isActive: false}).then(() => {

            })

            User.findOne({uuid: id}).then((user,err) => {
                if (user !== null) {
                    let initialBets = user.activeBets
                    initialBets.push({
                        betId: betId,
                        name: name,
                        wagerAmount: wagerAmount,
                        currentPercentage: currentPercentage,
                        school: school, 
                        gambleTo: gambleTo,
                    })
                }
            })

            



        }
    })




})




app.get("/", (req,res) => {
    res.send("type shit?")
})



server.listen(process.env.PORT, () => {
    console.log("Server has started")
})
