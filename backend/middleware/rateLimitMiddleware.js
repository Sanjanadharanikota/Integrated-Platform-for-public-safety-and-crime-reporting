const windows = new Map();

const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of windows.entries()) {
        if (value.expiresAt <= now) {
            windows.delete(key);
        }
    }
};

setInterval(cleanup, 60 * 1000).unref();

exports.createRateLimiter = ({ windowMs, maxRequests, message }) => {
    return (req, res, next) => {
        const key = `${req.ip}:${req.baseUrl}:${req.path}`;
        const now = Date.now();
        const entry = windows.get(key);

        if (!entry || entry.expiresAt <= now) {
            windows.set(key, {
                count: 1,
                expiresAt: now + windowMs
            });
            next();
            return;
        }

        if (entry.count >= maxRequests) {
            res.status(429).json({
                success: false,
                message
            });
            return;
        }

        entry.count += 1;
        next();
    };
};
