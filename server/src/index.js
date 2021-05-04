require('dotenv/config');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { verify } = require('jsonwebtoken');
const { hash, compare } = require('bcryptjs');
const {
  createAccessToken,
  createRefreshToken,
  sendAccessToken,
  sendRefreshToken
} = require('./tokens.js')

const { fakeDB } = require('./fakeDB.js')
const { isAuth } = require('./isAuth.js')

const server = express();

server.use(cookieParser());

server.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

server.use(express.json()); //to support json encoded bodies
server.use(express.urlencoded({ extended: true }))

//1. Register
server.post('/register', async(req, res) => {
  const { email, password } = req.body;

  try {
    //check if user exists

    const user = fakeDB.find(user => user.email === email);
    if(user) throw new Error('User already exists');

    const hashedPassword = await hash(password, 10);

    fakeDB.push({
      id: fakeDB.length,
      email,
      password: hashedPassword
    })

    res.send({message: 'User Created'});

    console.log(fakeDB)

  } catch (err) {
    res.send({
      error: `${err.message}`
    })
  }
})

//2. Login
server.post('/login', async(req, res) => {
  const { email, password } = req.body;

  try {
    const user = fakeDB.find(user => user.email === email);
    if(!user) throw new Error('User does not exist');

    const valid = await compare(password, user.password);
    if(!valid) throw new Error('Password is not correct');

    const accesstoken = createAccessToken(user.id);
    const refreshtoken = createRefreshToken(user.id);

    user.refreshtoken = refreshtoken;
    console.log(fakeDB);

    //send tokens. Refresh token as a cookie and access token as a reg response
    sendRefreshToken(res, refreshtoken);
    sendAccessToken(res, req, accesstoken);

  } catch(err) {
    res.send({
      error: `${err.message}`
    })
  }
});


//3. Logout
server.post('/logout', (_req, res) => {
  res.clearCookie('refreshtoken', { path: '/refresh_token'});
  return res.send({
    message: 'Logged out'
  })
})

//4. Setup a protected route
server.post('/protected', async (req, res) => {
  try {
    const userId = isAuth(req);

    if(userId !== null) {
      res.send({
        data: 'This is protected data.'
      })
    }
  } catch(err) {
    res.send({
      error: `${err.message}`
    })
  }
})

//5. Get a new access token with a refresh token
server.post('/refresh_token', (req, res) => {
  const token = req.cookies.refreshtoken;

  console.log(token)

  if(!token) return res.send({accesstoken: ''})

  let payload = null;

  try {
    payload = verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    console.log(err)
    return res.send({accesstoken: ''})
  }

  const user = fakeDB.find(user => user.id === payload.userId);

  console.log(user)
  if(!user) return res.send({accesstoken: ''});

  if(user.refreshtoken !== token) {
    return res.send({accesstoken:''})
  }

  const accesstoken = createAccessToken(user.id);
  const refreshtoken = createRefreshToken(user.id)
  user.refreshtoken = refreshtoken;

  sendRefreshToken(res, refreshtoken);
  return res.send({accesstoken});
})


server.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`)
})
