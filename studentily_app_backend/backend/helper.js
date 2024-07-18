import jwt from "jsonwebtoken";

function tokenAuth(req, res, next) {
  const headerAuth = req.headers["authorization"];
  const token = headerAuth && headerAuth.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.sendStatus(401);
    }
    req.user = user;
    next();
  });
}

export default tokenAuth;
