// api getaway application
require('dotenv').config()
const express = require('express');
const config = require('./config')
const buildRouter = require('./proxy/router')
const rateLimiter = require('./middleware/rateLimiter')
const auth = require('./middleware/auth')
const helmet = require('helmet')
const { recordRequest, getMetrics, getContentType } = require('./metrics')

const app = express()
app.use(helmet())
app.use(express.json({ limit: '10kb' }))

app.get('/_health',(req,res)=>{
    res.json({status:'ok'})
})

// metrics collection middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - start;
    const throttled = res.statusCode === 429;
    recordRequest(req.path, latency, throttled);
  });
  next();
});


// metrics endpoint
app.get('/_metrics', async (req, res) => {
  res.set('Content-Type', getContentType());
  res.send(await getMetrics());
});

const middlewareMap = {
    rateLimiter,
    auth,
}

buildRouter(app, middlewareMap);

app.listen(config.server.port, ()=>{
    console.log(`Gateway running on port ${config.server.port}`)
})