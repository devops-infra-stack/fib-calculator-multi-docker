const keys = require('./keys');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres client setup
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort,
});

pgClient.on('error', () => {
    console.log('Lost PG connection');
});

pgClient.on('connect', (client) => {
    client.query('CREATE TABLE IF NOT EXISTS values (number INT)')
        .catch((err) => {
            console.log(err.message);
        });
});

// Redis v4 requires explicit connect() and uses Promise-based API
const redisClient = redis.createClient({
    socket: {
        host: keys.redisHost,
        port: keys.redisPort,
        reconnectStrategy: () => 1000,
    },
});

const redisPublisher = redisClient.duplicate();

redisClient.on('error', (err) => console.log('Redis client error:', err));
redisPublisher.on('error', (err) => console.log('Redis publisher error:', err));

(async () => {
    await redisClient.connect();
    await redisPublisher.connect();
})();

// Express route handlers
app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    const values = await redisClient.hGetAll('values');
    res.send(values);
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (index > 40) return res.status(422).send('Index too high');

    await redisClient.hSet('values', index, 'Nothing yet!');
    await redisPublisher.publish('insert', index);

    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({ working: true });
});

app.listen(5000, () => {
    console.log('Listening');
});
