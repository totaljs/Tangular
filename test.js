var str = `Hello {{name}}!

{{if name.length > 0}}
    <div>OK</div>
{{else}}
    <div>NO</div>
{{fi}}

{{ $.page }}

{{if name !== null}}
    <div>{{ name | uppercase | lowercase }}</div>
{{fi}}

{{foreach a in items}}
    <div>{{a.name}}</div>
    {{ foreach b in a.tags }}
    	{{ a }}
    {{ end }}
{{end}}`;

var variables = {};
var loopcount = 0;
var ifcount = 0;
var emptybeg = '\'+';
var emptyend = '+\'';

var output = str.replace(/\{\{.*?\}\}/g, function(text) {

	var cmd = text.replace(/\{\{|\}\}/g, '').trim();

	if (cmd === 'fi') {
		ifcount--;
		// end of condition
		return '';
	} else if (cmd === 'end') {
		loopcount--;
		// end of loop
		return '';
	} else if (cmd === 'else') {
		// else
		return '';
	} else if (cmd.substring(0, 3) === 'if ') {
		ifcount++;
		// condition
		return '';
	} else if (cmd.substring(0, 8) === 'foreach ') {
		loopcount++;
		// loop
		return '';
	} else if (cmd.substring(0, 8) === 'else if ' || cmd.substring(0, 7) === 'elseif ') {
		// else if
		return '';
	}

	var variable = cmd.match(/^[a-z0-9$]+/i).toString();

	if (variables[variable])
		variables[variable]++;
	else
		variables[variable] = 1;

	var helpers = cmd.split('|');

	return emptybeg + '$read(' + helpers[0].trim() + ')' + emptyend;
	// console.log(cmd, ifcount, loopcount);
});
