(function(W) {

	if (W.Tangular)
		return;

	var Tangular = {};
	var Thelpers = Tangular.helpers = {};

	Tangular.version = 'v5.0.6';
	Tangular.cache = {};

	W.Ta = W.Tangular = Tangular;
	W.Thelpers = Thelpers;

	// Keywords and built-in objects can't be used as names of model fields
	var SKIP = { 'null': true, 'undefined': true, 'true': true, 'false': true, 'Object': 1, 'String': 1, 'Number': 1, 'Boolean': 1, 'Date': 1, 'Array': 1, 'window': 1, 'global': 1, 'arguments': 1, 'eval': 1, 'Function': 1, 'function': 1, 'var': 1, 'let': 1, 'const': 1, 'delete': 1, 'typeof': 1, 'instanceof': 1, 'new': 1, 'in': 1, 'void': 1, 'this': 1, 'NaN': 1, 'Infinity': 1, 'Math': 1, 'JSON': 1, 'RegExp': 1, 'parseInt': 1, 'parseFloat': 1, 'isNaN': 1, 'isFinite': 1, 'encodeURIComponent': 1, 'decodeURIComponent': 1, '$index': 1 };
	var REG_CMDFIND = /\{\{.*?\}\}/g;
	var REG_CMDCLEAN = /\{\{|\}\}/g;
	var REG_ENCODE = /[<>&"']/g;
	var REG_ENCODETEST = /[<>&"']/;
	var REG_TRIM = /\n$/g;
	var REG_ESCAPE = /[.*+?^${}()|[\]\\]/g;

	// A path at the beginning of a command, e.g. "user.address.city" or "items[0].name"
	var REG_PATH = /^[a-zA-Z_$][\w$]*(?:\[[^[\]]*\])*(?:\.[a-zA-Z_$][\w$]*(?:\[[^[\]]*\])*)+/;
	var CACHELIMIT = 1000;
	var cachecount = 0;

	function isidentifier(c, first) {
		return (c > 64 && c < 91) || (c > 96 && c < 123) || c === 95 || c === 36 || (!first && c > 47 && c < 58);
	}

	// Returns names of variables used in the expression
	function parseInlineVariables(line, blacklist) {

		var variables = [];
		var length = line.length;
		var prev = 0; // the last significant character
		var i = 0;

		while (i < length) {

			var c = line.charCodeAt(i);

			// A string: "`" or "'" or "\""
			if (c === 96 || c === 34 || c === 39) {
				i++;
				while (i < length) {
					var s = line.charCodeAt(i++);
					if (s === 92)
						i++;
					else if (s === c)
						break;
				}
				prev = c;
				continue;
			}

			// A number, e.g. 1.5 or 0xFF
			if (c > 47 && c < 58) {
				i++;
				while (i < length && (isidentifier(line.charCodeAt(i)) || line.charCodeAt(i) === 46))
					i++;
				prev = c;
				continue;
			}

			if (isidentifier(c, true)) {

				var beg = i++;

				while (i < length && isidentifier(line.charCodeAt(i)))
					i++;

				// A name after "." is a property and a name after "|" is a helper
				if (prev !== 46 && prev !== 124) {
					var name = line.substring(beg, i);
					if (!SKIP[name] && variables.indexOf(name) === -1 && (!blacklist || blacklist.indexOf(name) === -1))
						variables.push(name);
				}

				prev = c;
				continue;
			}

			// White-spaces are skipped
			if (c !== 32 && c !== 9 && c !== 10 && c !== 13)
				prev = c;

			i++;
		}

		return variables;
	}

	// Splits helpers "value | helper1 | helper2('a|b')"
	function splitpipes(cmd) {

		var arr = [];
		var beg = 0;
		var depth = 0;
		var quote = 0;

		for (var i = 0; i < cmd.length; i++) {

			var c = cmd.charCodeAt(i);

			if (quote) {
				if (c === 92)
					i++;
				else if (c === quote)
					quote = 0;
				continue;
			}

			if (c === 96 || c === 34 || c === 39)
				quote = c;
			else if (c === 40 || c === 91 || c === 123)
				depth++;
			else if (c === 41 || c === 93 || c === 125)
				depth--;
			else if (c === 124 && depth <= 0) {
				arr.push(cmd.substring(beg, i));
				beg = i + 1;
			}
		}

		arr.push(cmd.substring(beg));
		return arr;
	}

	Tangular.toArray = function(obj) {
		var keys = Object.keys(obj);
		var arr = [];
		for (var i = 0, length = keys.length; i < length; i++)
			arr.push({ key: keys[i], value: obj[keys[i]] });
		return arr;
	};

	function Template() {
		this.commands;
		this.variables;
		this.builder;
		this.split = '\0';
	}

	Template.prototype.compile = function(template, tagbeg, tagend) {

		var self = this;
		var ifcount = 0;
		var loopcount = 0;
		var loops = [];
		var reg_find = REG_CMDFIND;
		var reg_clean = REG_CMDCLEAN;
		var tmp;

		if (tagbeg && tagend) {

			// Tags without "\\" aren't regular expressions, so special characters must be escaped
			if (tagbeg.indexOf('\\') === -1)
				tagbeg = tagbeg.replace(REG_ESCAPE, '\\$&');

			if (tagend.indexOf('\\') === -1)
				tagend = tagend.replace(REG_ESCAPE, '\\$&');

			reg_find = new RegExp(tagbeg + '.*?' + tagend, 'g');
			reg_clean = new RegExp(tagbeg + '|' + tagend, 'g');
		}

		self.template = template;

		template = template.replace(/\|\|/g, '\1');

		self.variables = {};
		self.commands = [];

		self.builder = template.replace(reg_find, function(text) {

			var cmd = text.replace(reg_clean, '').trim();
			var variable = null;
			var helpers = null;
			var index;
			var isif = false;
			var isloop = false;
			var iscode = true;

			if (cmd === 'fi') {
				ifcount--;
				// end of condition
			} else if (cmd === 'end') {
				loopcount--;
				// end of loop
				loops.pop();
			} else if (cmd.substring(0, 3) === 'if ') {
				// condition
				ifcount++;
				variable = parseInlineVariables(cmd.substring(3), loops);
				if (variable.length) {
					for (var i = 0; i < variable.length; i++) {
						var name = variable[i];
						if (self.variables[name])
							self.variables[name]++;
						else
							self.variables[name] = 1;
					}
				} else
					variable = null;
				isif = true;
				iscode = true;
			} else if (cmd.substring(0, 8) === 'foreach ') {

				loopcount++;
				// loop

				tmp = cmd.substring(8).split(' ');
				loops.push(tmp[0].trim());

				index = tmp[2].indexOf('.');
				if (index !== -1)
					tmp[2] = tmp[2].substring(0, index);

				variable = tmp[2].trim();

				if (loops.indexOf(variable) === -1) {
					if (self.variables[variable])
						self.variables[variable]++;
					else
						self.variables[variable] = 1;
					variable = [variable];
				}
				else
					variable = null;

				isloop = true;
			} else if (cmd.substring(0, 8) === 'else if ') {
				// else if
				variable = parseInlineVariables(cmd.substring(8), loops);
				if (variable.length) {
					for (var i = 0; i < variable.length; i++) {
						var name = variable[i];
						if (self.variables[name])
							self.variables[name]++;
						else
							self.variables[name] = 1;
					}
				} else
					variable = null;
				isif = true;
			} else if (cmd !== 'continue' && cmd !== 'break' && cmd !== 'else') {

				variable = parseInlineVariables(cmd);

				var ishelper = false;

				for (var i = 0; i < variable.length; i++) {
					var v = variable[i];

					if (v + '(' === cmd.substring(0, v.length + 1)) {
						ishelper = true;
						continue;
					}

					if (self.variables[v])
						self.variables[v]++;
					else
						self.variables[v] = 1;
				}

				if (!variable.length)
					variable = null;

				var fnhelper = null;

				helpers = splitpipes(cmd);

				if (ishelper) {
					fnhelper = helpers[0];
					helpers[0] = '';
				} else if (helpers.length === 1)
					helpers.push(' encode');

				cmd = helpers[0];
				helpers = helpers.slice(1);

				if (ishelper)
					helpers.unshift(fnhelper);

				if (helpers.length) {
					for (var i = 0; i < helpers.length; i++) {
						var helper = helpers[i].trim();
						var ishelperfirst = ishelper && !i;
						index = helper.indexOf('(');
						if (index === -1) {
							helper = 'Thelpers.$execute($helpers,model,\'' + helper + '\',' + (ishelperfirst ? '' : '\7)');
						} else
							helper = 'Thelpers.$execute($helpers,model,\'' + helper.substring(0, index) + '\',' + (ishelperfirst ? '' : '\7,') + helper.substring(index + 1);
						helpers[i] = helper;
					}
				} else
					helpers = null;

				cmd = self.safe(cmd.trim() || 'model');
				iscode = false;
			}

			self.commands.push({ index: self.commands.length, cmd: cmd, ifcount: ifcount, loopcount: loopcount, variable: variable, helpers: helpers, isloop: isloop, isif: isif, iscode: iscode });

			return self.split;

		}).split(self.split);

		for (var i = 0; i < self.builder.length; i++) {
			var m = self.builder[i];
			self.builder[i] = m ? m.replace(REG_TRIM, '') : m;
		}

		return self.make();
	};

	// Makes a safe reading of the path at the beginning of the command: "a.b.c" --> "a==null?'':a.b==null?'':a.b.c"
	Template.prototype.safe = function(cmd) {

		var match = cmd.match(REG_PATH);
		if (!match)
			return cmd;

		var path = match[0];
		var output = [];
		var depth = 0;

		for (var i = 0; i < path.length; i++) {
			var c = path.charCodeAt(i);
			if (c === 91)
				depth++;
			else if (c === 93)
				depth--;
			else if (c === 46 && !depth)
				output.push(path.substring(0, i) + '==null?\'\':');
		}

		return output.join('') + cmd;
	};

	Template.prototype.make = function() {

		var self = this;
		var builder = ['var $output=$text[0];var $tmp;var $index=0;'];
		var loops = [];
		var loopindex = 0;

		for (var i = 0, length = self.commands.length; i < length; i++) {

			var cmd = self.commands[i];
			var tmp;

			i && builder.push('$output+=$text[' + i + '];');

			if (cmd.iscode) {

				if (cmd.isloop) {

					// Unique names within the template
					var name = '$i' + (loopindex++);
					var namea = name + 'a';
					var names = name + 's';
					var item = cmd.cmd.split(' ')[1];
					var index = cmd.cmd.lastIndexOf(' in ');
					if (index === -1)
						index = cmd.cmd.lastIndexOf(' of ');
					tmp = cmd.cmd.substring(index + 4).trim();
					tmp = namea + '=' + self.safe(tmp) + ';if(!(' + namea + ' instanceof Array)){if(' + namea + '&&typeof(' + namea + ')===\'object\')' + namea + '=Tangular.toArray(' + namea + ')}if(' + namea + ' instanceof Array&&' + namea + '.length){for(var ' + name + '=0,' + name + 'l=' + namea + '.length;' + name + '<' + name + 'l;' + name + '++){$index=' + name + ';var ' + item + '=' + namea + '[' + name + '];';

					// The item of the loop can have the same name as a field of the model, so its value is kept
					builder.push('var ' + names + '=' + item + ';' + tmp);
					loops.push({ name: name, backup: names, item: item });

				} else if (cmd.isif) {
					if (cmd.cmd.substring(0, 8) === 'else if ')
						builder.push('}' + cmd.cmd.substring(0, 8).trim() + '(' + cmd.cmd.substring(8).trim() + '){');
					else
						builder.push(cmd.cmd.substring(0, 3).trim() + '(' + cmd.cmd.substring(3).trim() + '){');
				} else {
					switch (cmd.cmd) {
						case 'else':
							builder.push('}else{');
							break;
						case 'end':
							tmp = loops.pop();
							// Restores the value of the item and the index of the parent loop
							builder.push('}}' + (tmp ? (tmp.item + '=' + tmp.backup + ';') : '') + (loops.length ? ('$index=' + loops[loops.length - 1].name + ';') : ''));
							break;
						case 'fi':
							builder.push('}');
							break;
						case 'break':
							builder.push('break;');
							break;
						case 'continue':
							builder.push('continue;');
							break;
					}
				}

			} else {
				if (cmd.helpers) {
					var str = '';
					for (var j = 0; j < cmd.helpers.length; j++) {
						var helper = cmd.helpers[j];
						if (j === 0)
							str = helper.replace('\7', cmd.cmd.trim()).trim();
						else
							str = helper.replace('\7', str.trim());
					}
					builder.push('$tmp=' + str + ';if($tmp!=null)$output+=$tmp;');
				} else
					builder.push('if(' + cmd.cmd + '!=null)$output+=' + cmd.cmd + ';');
			}
		}

		builder.push((length ? ('$output+=$text[' + length + '];') : '') + 'return $output.charAt(0) === \'\\n\'?$output.substring(1):$output;');
		delete self.variables.$;
		var variables = Object.keys(self.variables);
		var names = ['$helpers||{}', '$||{}', 'model'];

		for (var i = 0; i < variables.length; i++)
			names.push('model.' + variables[i]);

		for (var i = 0; i < self.builder.length; i++)
			self.builder[i] = self.builder[i].replace(/\1/g, '||');

		var code = 'var tangular=function($helpers,$,model' + (variables.length ? (',' + variables.join(',')) : '') + '){' + builder.join('') + '};return function(model,$,$helpers){if(model==null)model={};try{return tangular(' + names.join(',') + ')}catch(e){console.error(\'Tangular error:\',e + \'\',$template)}}';
		return (new Function('$text', '$template', code.replace(/\1/g, '||')))(self.builder, self.template);
	};

	Thelpers.$execute = function(helpers, model, name, a, b, c, d, e, f, g, h) {

		var fn = helpers[name] || Thelpers[name];

		if (!fn) {
			console && console.warn('Tangular: missing helper', '"' + name + '"');
			return a;
		}

		return fn.call(model, a, b, c, d, e, f, g, h);
	};

	Thelpers.encode = function(value, type) {

		if (type) {

			if (typeof(type) === 'function')
				return type(value);

			if (type === 'json')
				return JSON.stringify(value);

			if (type === 'json2')
				return JSON.stringify(value, null, '\t');

			if (type === 'url' || type === 'urlencoded')
				return encodeURIComponent(value);

			if (type === 'querify')
				return typeof(QUERIFY) === 'function' ? QUERIFY(value) : value;
		}

		if (value == null)
			return '';

		value = value + '';

		// The most of values don't contain any special character
		return REG_ENCODETEST.test(value) ? value.replace(REG_ENCODE, encodechar) : value;
	};

	function encodechar(c) {
		switch (c) {
			case '&': return '&amp;';
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '"': return '&quot;';
			case '\'': return '&#39;';
		}
		return c;
	}

	Thelpers.raw = function(value) {
		return value;
	};

	Tangular.render = function(template, model, repository, helpers) {

		var fn = Tangular.cache[template];

		if (!fn) {

			// Prevents a memory leak with dynamically generated templates
			if (cachecount++ >= CACHELIMIT) {
				Tangular.cache = {};
				cachecount = 1;
			}

			fn = Tangular.cache[template] = new Template().compile(template);
		}

		return fn(model == null ? {} : model, repository, helpers);
	};

	Tangular.compile = function(template, tagbeg, tagend) {
		return new Template().compile(template, tagbeg, tagend);
	};

	Tangular.register = function(name, fn) {
		Thelpers[name] = fn;
		return Tangular;
	};

	// Node.js
	if (typeof(module) !== 'undefined' && module.exports)
		module.exports = Tangular;

})(typeof(window)==='undefined'?global:window);