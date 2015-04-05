var util = require('util');
var fs = require('fs');
var xml2js = require('xml2js');

fs.readFile(__dirname + '/Config.xml', function(err, data) {
    xml2js.parseString(data, function (err, globalConfig) {
        console.log(util.inspect(globalConfig, false, null));
        var config = {
            user: globalConfig.config.db[0].user[0],
            password: globalConfig.config.db[0].password[0],
            server: globalConfig.config.db[0].server[0],
            port: globalConfig.config.db[0].port[0],
            database: globalConfig.config.db[0].database[0]
        };
        console.log(config);
    });
});
