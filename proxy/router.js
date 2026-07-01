const {createProxyMiddleware} = require('http-proxy-middleware')

const config = require('../config')

function buildRouter(app, middlewareMap){
    config.routes.forEach(route => {
        const handlers = []

        if (route.rate_limit){
            handlers.push(middlewareMap.rateLimiter(route));
        }

        if (route.protected){
            handlers.push(middlewareMap.auth)
        }

        handlers.push(createProxyMiddleware({
            target: route.target,
            changeOrigin: true,
            on: {
                error : (err,req,res) => {
                    console.error(`Proxy error for ${route.path}:`, err.message);
                    res.status(502).json({error: 'Bad Gateway'})
                }
            }
        }))

        app.use(route.path, ...handlers)
    })
}

module.exports = buildRouter