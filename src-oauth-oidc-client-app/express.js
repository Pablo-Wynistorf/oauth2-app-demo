require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Issuer } = require('openid-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Use session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Initialize OIDC client
let oidcClient;

(async () => {
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER);
  console.log('Discovered issuer %s %O', issuer.issuer, issuer.metadata);
  oidcClient = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID,
    client_secret: process.env.OIDC_CLIENT_SECRET,
    redirect_uris: [process.env.OIDC_REDIRECT_URI],
    response_types: ['code'],
  });

  // Route for the home page
  app.get('/', (req, res) => {
    res.send('<a href="/login">Login</a>');
  });

  // Route for initiating OIDC flow
// Your /login route
app.get('/login', async (req, res, next) => {
  try {
    const state = Math.random().toString(36).substring(7);
    req.session.oidcState = state; // Store the state in the session
    const authorizationUrl = oidcClient.authorizationUrl({
      redirect_uri: process.env.OIDC_REDIRECT_URI,
      scope: 'openid profile email',
      state: state
    });
    res.redirect(authorizationUrl);
  } catch (err) {
    next(err);
  }
});

// Your /auth/callback route
app.get('/auth/callback', async (req, res, next) => {
  try {
    const params = oidcClient.callbackParams(req);

    // Initialize oidcClient.checks if needed
    oidcClient.checks = {};

    // Set the state property
    console.log(oidcClient.checks.state, req.session.oidcState)

    oidcClient.checks.state = req.session.oidcState;

    const tokenSet = await oidcClient.callback(process.env.OIDC_REDIRECT_URI, params);
    console.log('Received tokens:', tokenSet);

    // Handle the tokens, e.g., store them in session or cookie
    res.redirect('/home'); // Redirect to home page upon successful login
  } catch (err) {
    next(err);
  }
});


  

  // Route for the home page after successful login
  app.get('/home', (req, res) => {
    res.send('Login successful! Tokens received.');
  });

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})();
