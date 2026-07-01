const express = require('express');
const config = require('./config')
const buildRouter = require('./proxy/router')

const app = express()
app.use(express.json())

app.get('/_health',(req,res)=>{
    res.json({status:'ok'})
})

const middlewareMap = {
    rateLimiter: (route) => (req,res,next) => next(),
    auth: (req,res,next) => next(),
}

buildRouter(app, middlewareMap);

app.listen(config.server.port, ()=>{
    console.log(`Gateway running on port ${config.server.port}`)
})