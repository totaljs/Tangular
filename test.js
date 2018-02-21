var str = `Hello {{name}}!

{{if name.length > 0}}
    <div>OK</div>
{{else}}
    <div>NO</div>
{{fi}}

{{if name !== null}}
    <div>{{ name | uppercase | lowercase }}</div>
{{fi}}

{{foreach a in items}}
    <div>{{a.name}}</div>
    {{ foreach b in a.tags }}
    	{{ a }}
    {{ end }}
{{end}}`;

var loops = [];
var loopcount = 0;
var ifcount = 0;

str.match(/\{\{.*?\}\}/g).forEach(function(item) {
	var cmd = item.replace(/\{\{|\}\}/g, '').trim();

	if (cmd === 'fi') {
		ifcount--;
		// end of condition
		return;
	} else if (cmd === 'end') {
		loopcount--;
		// end of loop
		return;
	} else if (cmd.substring(0, 3) === 'if ') {
		ifcount++;
		// condition
		return;
	} else if (cmd.substring(0, 8) === 'foreach ') {
		loopcount++;
		// loop
		return;
	} else if (cmd.substring(0, 8) === 'else if ' || cmd.substring(0, 7) === 'elseif ') {
		// else if
		return;
	}

	console.log(cmd, ifcount, loopcount);
});