import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY;

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send('Unauthorized: No token provided');
    }

    try {
        req.user = jwt.verify(token, SECRET_KEY); // Attaches username and isAdmin to the request
        next();
    } catch (err) {
        res.status(403).send('Invalid or expired token');
    }
};