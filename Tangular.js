(function(W) {

	if (W.Tangular)
		return;

	var Tangular = {};
	Tangular.helpers = {};
	Tangular.version = 'v2.0.0';
	Tangular.cache = {};
	Tangular.ENCODE = /[<>&"]/g;
	Tangular.TRIM = /\n$/g;
	Tangular.debug = false;
	Tangular.settings = {
		delimiters: ['{{', '}}'],
	};
	Tangular.i = {};
	Tangular.i.white = /\W/;
	Tangular.i.numbers = { '0':1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 1, '8': 1, '9': 1 };
	Tangular.i.allow = { '$': 1, '.': 1 };

	W.Ta = W.Tangular = Tangular;

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
		var text;
		var txt = [];
		var txtindex = -1;

		while (length > index++) {

			var c = str.substring(index, index + len);
			if (beg !== -1) {
				if (c === Tangular.settings.delimiters[1]) {
					if (count > 0) {
						count--;
						continue;
					}

					var cmd = str.substring(beg, index).trim();
					var tmp = cmd.substring(0, 3);

					if (tmp === 'if ' || tmp === 'for' || cmd === 'end' || cmd === 'fi' || cmd === 'else' || cmd === 'else if') {
						var l = txt.length - 1;
						if (txt[l])
							txt[l] = txt[l].replace(Tangular.TRIM, '');
					}

					builder.push(cmd);
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

				text = str.substring(end, index);
				if (text) {
					txtindex = txt.indexOf(text);
					if (txtindex === -1) {
						txtindex = txt.length;
						txt.push(text);
					}
				}
				builder.push(text ? 'txt[' + (txtindex) + ']' : '""');
				beg = index + len;
				continue;
			}
		}

		text = str.substring(end, length);
		if (text) {
			txtindex = txt.indexOf(text);
			if (txtindex === -1) {
				txtindex = txt.length;
				txt.push(text);
			}
		}

		builder.push(text ? 'txt[' + txtindex + ']' : '""');
		length = builder.length;

		var plus = '$output+=';
		var output = 'var $s=this,$output="",$t,$v;';
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
				cmd = '}else{';
				add = true;
			} else if (cmd.substring(0, 7) === 'else if') {
				cmd = '}else if( ' + cmd.substring(8) + '){';
				add = true;
			} else if (cmd3 === 'end' || cmd.substring(0, 6) === 'endfor') {
				if (skip.length)
					cmd = '}})()}';
				else
					cmd = '}}';
				skip.pop();
				add = true;
				eachCount--;
				if (!eachCount)
					isEach = false;
			}

			if (!add)
				cmd = Tangular.helper(cmd, skip, isEach, '$s');
			else
				cmd = Tangular.append(cmd, skip, isEach, '$s').trim();

			if (add) {
				if (arr) {
					var m = Tangular.append(arr[3], skip, isEach, '$s');
					cmd = 'if (' + m + '&&' + m + '.length){(function(){for(var i=0,length=' + m + '.length;i<length;i++){var ' + arr[1] + '=' + m + '[i];var $index=i;';
				}
				output += cmd;
			} else
				output += plus + cmd + ';';
		}

		var is = output.charCodeAt(output.length - 1) === 59;

		if (Tangular.debug) {
			console.log('Tangular:');
			console.log('function(helpers,$){' + output + (is ? '' : ';') + 'return $output;');
			console.log(str.trim());
			console.log('---------------------------');
			console.log('');
		}

		return function(model, $) {
			return new Function('helpers', '$', 'txt', output + (is ? '' : ';') + 'return $output;').call(model, Tangular.helperhandling, $, txt);
		};
	};

	Tangular.helperhandling = function(name) {
		var fn = Tangular.helpers[name];
		if (fn)
			return fn;
		console.warn('Tangular helper "' + name + '" not found.');
		return function(value) { return value === undefined ? 'undefined' : value === null ? 'null' : value.toString(); };
	};

	Tangular.helper = function(line, skip, isEach) {

		var index = line.indexOf('|');
		var property;

		if (index === -1) {
			property = Tangular.append(line.trim(), skip, isEach, '$s').trim();
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

	Tangular.parse = function(line, fn) {

		var builder = [];
		var skip = null;
		var command = [];

		for (var i = 0, length = line.length; i < length; i++) {
			var c = line.substring(i, i + 1);

			if (c === skip) {
				skip = null;
				builder = [];
				command.push(c);
				continue;
			}

			if (skip) {
				command.push(c);
				continue;
			}

			if (c === '\'' || c === '\"') {

				if (builder.length) {
					command.push(fn(builder.join('')));
					builder = [];
				}

				skip = c;
				command.push(c);
				continue;
			}

			if (Tangular.i.numbers[c] && !builder.length) {
				command.push(c);
				continue;
			}

			if (!Tangular.i.allow[c] && Tangular.i.white.test(c)) {

				if (builder.length) {
					command.push(fn(builder.join('')));
					builder = [];
				}

				command.push(c);
				continue;
			}

			if (c !== ' ')
				builder.push(c);
			else
				command.push(c);
		}

		builder.length && command.push(fn(builder.join('')));
		return command.join('');
	};

	Tangular.append = function(line, skipl, isEach, model) {

		if (skipl === undefined)
			skipl = [];

		if (!line)
			return 'Tangular.$wrap(' + (model || '$s') + ')';

		return Tangular.parse(line, function(updated) {

			switch (updated.trim()) {
				case 'else':
				case 'end':
				case 'endfor':
				case 'endif':
				case 'fi':
				case 'foreach':
				case 'if':
				case 'true':
				case 'false':
				case 'else if':
					return updated;
				case '$index':
					return updated;
			}

			var skip = false;

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

			if (updated === '$')
				return 'Tangular.$wrap($)';

			if (updated.substring(0, 2) === '$.') {
				model = '$';
				updated = updated.substring(2);
			}

			if (skip)
				return updated;

			c = updated.substring(0, 1);
			var code = c.charCodeAt(0);

			if (code > 47 && code < 58)
				return updated;

			return 'Tangular.$wrap(' + (model || '$s') + ',"' + updated + '")';
		});
	};

	Tangular.$wrap = function(model, path) {

		if (!model || !path)
			return model;

		var fn = Tangular.cache[path];
		if (fn === null)
			return model[path];

		if (fn)
			return fn(model);

		if (path.split('.').length === 1) {
			Tangular.cache[path] = null;
			return model[path];
		}

		try {
			fn = Tangular.cache[path] = new Function('XYZ', 'try{return XYZ.' + path + '}catch(e){return ""}');
		} catch(e) { fn = new Function('return ""'); }

		return fn(model);
	};

	Tangular.render = function(template, model, repository) {
		if (model == null)
			model = {};
		if (typeof(template) === 'string')
			template = Tangular.compile(template);
		return template(model, repository);
	};

	Tangular.register('encode', function(value) {
		return value == null ? '' : value.toString().replace(Tangular.ENCODE, function(c) {
			switch (c) {
				case '&': return '&amp;';
				case '<': return '&lt;';
				case '>': return '&gt;';
				case '"': return '&quot;';
			}
			return c;
		});
	});

	Tangular.register('raw', function(value) {
		return value == null ? '' : value;
	});

})(typeof(window) === 'undefined' ? global : window);

if (typeof(exports) !== 'undefined')
	module.exports = Tangular;