// middlewares/isAdmin.js

module.exports = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
      next(); // Allow access
    } else {
      res.status(403).send('Access denied');
    }
  };
  