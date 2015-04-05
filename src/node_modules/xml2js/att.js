var xml2js = require('xml2js');

var uppercasing = function (name) {
  console.log("called this function");
  return name.toUpperCase();
};

var parser = new xml2js.Parser({attrNameProcessors: [uppercasing]});

parser.parseString('<tagname attribute="value">content</tagname>',
  function(err, jsonResult){
    console.log(jsonResult);
});
