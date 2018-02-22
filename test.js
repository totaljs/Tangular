var Tangular = require('./tangular');
var output = Tangular.render('Hello {{ | raw }}', '<b>Peter</b>');
// Hello MODEL 1 and MODEL 2
console.log(output);
