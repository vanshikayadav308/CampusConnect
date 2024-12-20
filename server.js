const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./models/db'); // Import database connection
const isAdmin = require('./middlewares/isAdmin'); // Admin middleware

const app = express();

// Middleware
app.set('view engine', 'ejs'); // Set EJS as the templating engine
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.use(express.static('public')); // Serve static files
app.use(
  session({
    secret: 'your-secret-key', // Replace with a secure key
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something is stored
  })
);

// Test Database Connection
(async () => {
  try {
    await db.execute('SELECT 1'); // Simple query to test connection
    console.log('Database connected successfully.');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1); // Exit if database connection fails
  }
})();

// Middleware to Protect Routes
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next(); // User is logged in
  }
  res.redirect('/signin'); // Redirect to Sign-In if not logged in
}

// Routes

// Home Route
app.get('/', (req, res) =>
  res.render('home', { title: 'Welcome to CampusConnect', session: req.session })
);

// About Route
app.get('/about', (req, res) =>
  res.render('about', { title: 'About CampusConnect', session: req.session })
);

// Sign-Up Routes
app.get('/signup', (req, res) =>
  res.render('signup', { title: 'Sign Up', session: req.session })
);

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    await db.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [
      name,
      email,
      hashedPassword,
    ]);
    res.redirect('/signin'); // Redirect to Sign-In page
  } catch (err) {
    console.error('Sign-Up Error:', err);
    res.status(500).send('Something went wrong during sign-up.');
  }
});

// Sign-In Routes
app.get('/signin', (req, res) =>
  res.render('signin', { title: 'Sign In', session: req.session })
);

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).send('User not found.');
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid password.');
    }

    req.session.user = { id: user.id, name: user.name, isAdmin: user.isAdmin }; // Save user in session
    res.redirect('/'); // Redirect to home on success
  } catch (err) {
    console.error('Sign-In Error:', err);
    res.status(500).send('Something went wrong during sign-in.');
  }
});

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/signin'); // Redirect to Sign-In after logout
  });
});

// Feedback Routes
app.get('/feedback', isAuthenticated, (req, res) =>
  res.render('feedback', { title: 'Submit Feedback', session: req.session })
);

app.post('/feedback', isAuthenticated, async (req, res) => {
  const { content } = req.body;
  try {
    await db.execute('INSERT INTO feedback (user_id, content) VALUES (?, ?)', [
      req.session.user.id,
      content,
    ]);
    res.redirect('/feedback-success'); // Redirect to feedback success page
  } catch (err) {
    console.error('Feedback Submission Error:', err);
    res.status(500).send('Something went wrong during feedback submission.');
  }
});

app.get('/feedback-success', (req, res) =>
  res.render('feedback-success', { title: 'Feedback Submitted', session: req.session })
);

// Search Route
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  try {
    const [results] = await db.execute(
      'SELECT * FROM quizzes WHERE title LIKE ? OR category LIKE ?',
      [`%${query}%`, `%${query}%`]
    );
    res.render('search', { title: 'Search Results', results, query, session: req.session });
  } catch (err) {
    console.error('Search Error:', err);
    res.status(500).send('Something went wrong during the search.');
  }
});

// Admin Dashboard
app.get('/admin', isAdmin, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, username, email, isAdmin FROM users');
    const [feedback] = await db.execute(
      'SELECT feedback.id, feedback.content, users.username FROM feedback JOIN users ON feedback.user_id = users.id'
    );
    res.render('admin', { title: 'Admin Dashboard', users, feedback, session: req.session });
  } catch (err) {
    console.error('Admin Dashboard Error:', err);
    res.status(500).send('An error occurred.');
  }
});

// Delete User
app.post('/admin/delete-user/:id', isAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);
    res.redirect('/admin');
  } catch (err) {
    console.error('Delete User Error:', err);
    res.status(500).send('An error occurred while deleting the user.');
  }
});

// Delete Feedback
app.post('/admin/delete-feedback/:id', isAdmin, async (req, res) => {
  const feedbackId = req.params.id;
  try {
    await db.execute('DELETE FROM feedback WHERE id = ?', [feedbackId]);
    res.redirect('/admin');
  } catch (err) {
    console.error('Delete Feedback Error:', err);
    res.status(500).send('An error occurred while deleting the feedback.');
  }
});

// 404 Route
app.use((req, res) => {
  res.status(404).send('Page not found.');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
