const static = require('node-static');
const http = require('http');

const fileServer = new static.Server('./test', { cache: 7200});

http.createServer((request, response) => {
  fileServer.serve(request, response, (err, res) => {
    if (err) { // An error has occured
      console.error("> Error serving " + request.url + " - " + err.message);
      response.writeHead(err.status, err.headers);
      response.end();
    } else { // The file was served successfully
      // don't log for testing purposes
      // console.log("> " + request.url + " - " + res.message);
    }
  });
}).listen(8080);

console.log("> node-static is listening on http://127.0.0.1:8080");