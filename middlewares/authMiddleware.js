const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  if (err) {
    console.error("JWT verify error:", err);
    return res.sendStatus(403);
  }
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
};

module.exports = { verifyToken, isAdmin };
