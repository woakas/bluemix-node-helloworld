var port = (process.env.VCAP_APP_PORT || 8192);
var host = (process.env.VCAP_APP_HOST || 'localhost');
var http = require('http');
var static = require('node-static');


var file = new static.Server('./public');

http.createServer(function(req, res) {
    req.addListener('end', function () {
        //
        // Serve files!
        //
        file.serve(req, res);
    }).resume();
}).listen(port, host);
