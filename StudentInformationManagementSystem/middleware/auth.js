const jwt = require("jsonwebtoken");
const { parseCookies } = require("./csrf");

const auth = (req, res, next) => {
  try {
    const token = parseCookies(req.headers.cookie).auth_token;
    if (!token) {
      return res.status(401).json({ message: "Authentication token is required" });
    }
    req.user = jwt.verify(token, process.env.JWY_SCREATE);
    next();
  } catch (err) {
    res.status(401).json({ message: "Your session is invalid or has expired" });
  }
}
module.exports = auth
