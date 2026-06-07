require 'webrick'
server = WEBrick::HTTPServer.new(
  Port: 3333,
  DocumentRoot: '/Users/wilianleao/Desktop/Site da nova',
  Logger: WEBrick::Log.new('/dev/null'),
  AccessLog: []
)
trap('INT') { server.shutdown }
server.start
