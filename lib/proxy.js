var httpProxy = require("http-proxy");

var proxy = httpProxy.createProxyServer(options);
proxy.web(req, res, { target: "http://localhost:3000" });
