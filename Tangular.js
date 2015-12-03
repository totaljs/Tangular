var Tangular = {};
Tangular.helpers = {};
Tangular.settings = {
	delimiters: ['{{', '}}']
};

Tangular.register = function(name, fn) {
	Tangular.helpers[name] = fn;
	return Tangular;
};

Tangular.compile = function(str) {

	if (!str)
		str = '';

	var index = -1;
	var builder = [];
	var beg = -1;
	var end = 0;
	var length = str.length;
	var count = 0;
	var len = Tangular.settings.delimiters[0].length;
	while (length > index++) {

		var c = str.substring(index, index + len);
		if (beg !== -1) {
			if (c === Tangular.settings.delimiters[1]) {
				if (count > 0) {
					count--;
					continue;
				}
				builder.push(str.substring(beg, index).trim());
				end = index + len;
				beg = -1;
				continue;
			}

			continue;
		}

		if (c === Tangular.settings.delimiters[0]) {

			if (beg !== -1) {
				count++;
				continue;
			}

			var text = str.substring(end, index);
			builder.push(text ? 'unescape("' + escape(text) + '")' : '""');
			beg = index + len;
			continue;
		}
	}

	builder.push('unescape("' + escape(str.substring(end, length)) + '")');
	length = builder.length;

	var plus = '$output+=';
	var output = 'var $s=this,$output="",$t;';
	var skip = [];
	var isEach = false;
	var eachCount = 0;

	for (var i = 0; i < length; i++) {

		if (i % 2 === 0) {
			output += plus + builder[i] + ';';
			continue;
		}

		var cmd = builder[i];
		var add = false;
		var index = cmd.lastIndexOf('|');
		var arr = null;
		var cmd3 = cmd.substring(0, 3);

		if (cmd3 === 'if ') {
			cmd = 'if( ' + cmd.substring(3) + '){';
			add = true;
		}

		if (cmd.substring(0, 8) === 'foreach ') {
			arr = cmd.split(' ');
			if (arr[1] === 'var')
				arr.splice(1, 1);
			skip.push(arr[1]);
			add = true;
			isEach = true;
			eachCount++;
	   }

		var cmd5 = cmd.substring(0, 5);

		if (cmd5 === 'endif' || cmd === 'fi') {
			cmd = '}';
			add = true;
		} else if (cmd5 === 'else') {
			cmd = '} else {';
			add = true;
		} else if (cmd.substring(0, 7) === 'else if') {
			cmd = '}else if( ' + cmd.substring(8) + '){';
			add = true;
		} else if (cmd3 === 'end' || cmd.substring(0, 6) === 'endfor') {
			if (skip.length === 0)
				cmd = '}';
			else
				cmd = '}})();';
			skip.pop();
			add = true;
			eachCount--;
			if (eachCount === 0)
				isEach = false;
		}

		if (!add) {
			cmd = Tangular.helper(cmd, skip, isEach);
		} else
			cmd = Tangular.append(cmd, skip, isEach).trim();

		if (add) {
			if (arr) {
				var m = Tangular.append(arr[3], skip, isEach);
				cmd = 'if (' + m + '===null||' + m + '===undefined)'+m+'=[];(function(){for(var i=0,length=' + m + '.length;i<length;i++){var ' + arr[1] + '=' + m + '[i];var $index=i;';
			}
			output += cmd;
		}
		else
			output += plus + cmd + ';';
	}

	return function(model) {
		return new Function('helpers', output + ';return $output;').call(model, function(name) {
			var fn = Tangular.helpers[name];
			if (fn)
				return fn;
			console.warn('Tangular helper "' + name + '" not found.');
			return function(value) { return value === undefined ? 'undefined' : value === null ? 'null' : value.toString(); };
		});
	};
}

Tangular.helper = function(line, skip, isEach) {

	var index = line.indexOf('|');
	var property;

	if (index === -1) {
		property = Tangular.append(line.trim(), skip, isEach).trim();
		return 'helpers("encode").call($s,' + property + ')';
	}

	property = Tangular.append(line.substring(0, index).trim(), skip, isEach).trim();
	line = line.substring(index + 1).trim().split('|');

	var output = '';

	for (var i = 0, length = line.length; i < length; i++) {
		var helper = line[i].trim().replace('()', '');
		var name;

		index = helper.indexOf('(');

		if (index === -1) {
			name = helper;
			helper = '.call($s,$t)';
		} else {
			name = helper.substring(0, index);
			helper = '.call($s,$t,' + helper.substring(index + 1);
		}

		helper = '$t=helpers("' + name + '")' + helper;
		output += helper + ';';
	}

	return '"";$t=' + property + ';' + output + '$output+=$t';
};

Tangular.append = function(line, skipl) {

	if (skipl === undefined)
		skipl = [];

	return line.replace(/[\_\$a-zá-žÁ-ŽA-Z0-9\s]+/g, function(word, index, text) {

		var c = text.substring(index - 1, index);
		var skip = false;
		var updated = word.trim();

		if (c === '"' || c === '\'' || c === '.')
			skip = true;

		switch (word.trim()) {
			case 'else':
			case 'end':
			case 'endfor':
			case 'endif':
			case 'fi':
			case 'foreach':
			case 'if':
			case 'else if':
				return word;
			case '$index':
				if (!skip)
					return word;
				break;
		}

		if (updated === '')
			return '';

		if (skip)
			return word;

		skip = false;

		for (var j = 0, length = skipl.length; j < length; j++) {

			var l = skipl[j].length;

			if (updated.substring(0, l) !== skipl[j])
				continue;

			if (updated.length !== l) {
				var c = updated.substring(l, l + 1);
				if (c !== '.' && c !== '+')
					continue;
			}

			skip = true;
			break;
		}

		if (skip)
			return updated;

		c = updated.substring(0, 1);
		var code = c.charCodeAt(0);

		if (code > 47 && code < 58)
			return updated;

		return '$s.' + updated;
	});
};

Tangular.render = function(template, model) {
	if (model === undefined || model === null)
		model = {};
	if (typeof(template) === 'string')
		template = Tangular.compile(template);
	return template(model);
};

Tangular.register('encode', function(value) {
	if (value === undefined || value === null)
		value = '';
	return value.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
});

Tangular.register('raw', function(value) {
	if (value === undefined || value === null)
		value = '';
	return value;
});

if (typeof(exports) !== 'undefined')
	module.exports = Tangular;
