const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ipl-dashboard-8e32a-default-rtdb.firebaseio.com" // Replace <YOUR_PROJECT_ID>
});
const db = admin.database();

app.get('/', (req, res) => {
  res.redirect('/signup');
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.send('Please provide username and password!');
  }

  // Save user in Firebase DB under "users/username"
  const userRef = db.ref('users/' + username);
  const snapshot = await userRef.once('value');
  if (snapshot.exists()) {
    return res.send('Username already exists! Please choose another.');
  }

  await userRef.set({ password: password });

  // Redirect to dashboard directly after signup with username
  res.redirect('/dashboard?user=' + encodeURIComponent(username));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userRef = db.ref('users/' + username);
  const snapshot = await userRef.once('value');

  if (!snapshot.exists()) {
    return res.send('Invalid credentials!');
  }

  const user = snapshot.val();
  if (user.password !== password) {
    return res.send('Invalid credentials!');
  }

  // Successful login → redirect to dashboard with username as query param
  res.redirect('/dashboard?user=' + encodeURIComponent(username));
});

app.get('/dashboard', (req, res) => {
  // simple authentication check:
  const username = req.query.user;
  if (!username) return res.redirect('/login');

  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// API endpoint to save search history in Firebase
app.post('/save-search', async (req, res) => {
  const { username, searchQuery } = req.body;
  if (!username || !searchQuery) {
    return res.status(400).send('Missing data');
  }

  const searchesRef = db.ref('searchHistory/' + username);
  await searchesRef.push({ query: searchQuery, timestamp: Date.now() });

  res.send('Search saved');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
