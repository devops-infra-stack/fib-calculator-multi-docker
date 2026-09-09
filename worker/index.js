const keys = require('./keys');
const redis = require('redis');

// Redis v4 requires explicit connect() and uses Promise-based API
const redisClient = redis.createClient({
    socket: {
        host: keys.redisHost,
        port: keys.redisPort,
        reconnectStrategy: () => 1000,
    },
});

const sub = redisClient.duplicate();

const fib = (index) => {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
};

redisClient.on('error', (err) => console.log('Redis client error:', err));
sub.on('error', (err) => console.log('Redis sub error:', err));

// In Redis v4, subscribe callback is passed directly to sub.subscribe()
(async () => {
    await redisClient.connect();
    await sub.connect();

    await sub.subscribe('insert', (message) => {
        redisClient.hSet('values', message, fib(parseInt(message)));
    });
})();
