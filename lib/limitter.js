const { RateLimiterMemory } = require("rate-limiter-flexible");
const Interchange = require("./interchange");
const interchange = new Interchange({
  name: "limitter",
  version: "1",
  debug: true,
});
const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 1, // per 1 second by IP
});

const limitter = (req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      next(interchange.error(429));
    });
};

module.exports = limitter;
