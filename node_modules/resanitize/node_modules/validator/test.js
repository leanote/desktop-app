v = require('./');

//console.log(v.sanitize('<scrRedirecRedirect 302t 302ipt type="text/javascript">prompt(1);</scrRedirecRedirect 302t 302ipt>').xss());

v.check('foo', 'The message needs to be between %1 and %2 characters long (you passed "%0")').len(4, 6);
