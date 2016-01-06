var start = Date.now();
var http = require('http');
var cluster = require('cluster');

var args = process.argv;

var app = require(args[args.length - 2]);
var port = args[args.length - 1] || app.port;
var callback = app.callback();
var server = http.createServer();
server.on('request', callback);
server.on('checkContinue', function(req, res) {
  req.checkContinue = true;
  callback(req, res);
});

// custom koa settings
// defaults to http://nodejs.org/api/http.html#http_server_maxheaderscount
server.maxHeadersCount = app.maxHeadersCount || 1000;
server.timeout = app.timeout || 120000;

server.listen(port, function(err) {
  if (err) throw err;
  console.log('[worker %s] listening on port %s [%sms]',
    app.name || 'app',
    this.address().port,
    Date.now() - start)
});

// don't try to close the server multiple times
var closing = false;
process.on('SIGTERM', function() {
  close(0);
});

process.on('SIGINT', function() {
  close(0);
});

process.on('uncaughtException', function(err) {
  console.error(err.stack);
  close(1);
});

process.on('exit', function() {
  console.log('[worker %s] exiting', cluster.worker.id);
});

function close(code) {
  if (closing) return;
  console.log('[worker %s] closing', cluster.worker.id)
  closing = true;

  // to do: make this an option
  var killtimer = setTimeout(function() {
    process.exit(code);
  }, 3000);

  // http://nodejs.org/api/timers.html#timers_unref
  killtimer.unref();
  server.close();
  cluster.worker.disconnect();
}
