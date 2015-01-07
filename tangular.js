var Thelpers = {};
var Tangular = {};

Tangular.register = function(name, fn) {
    Thelpers[name] = fn;
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

    while (length > index++) {

        var c = str.substring(index, index + 2);

        if (beg !== -1) {
            if (c === '}}') {
                if (count > 0) {
                    count--;
                    continue;
                }
                builder.push(str.substring(beg, index).trim());
                end = index + 2;
                beg = -1;
                continue;
            }

            continue;
        }

        if (c === '{{') {
            if (beg !== -1) {
                count++;
                continue;
            }

            var text = str.substring(end, index);
            builder.push(text ? 'unescape("' + escape(text) + '")' : '""');
            beg = index + 2;
            continue;
        }
    }

    builder.push('unescape("' + escape(str.substring(end, length)) + '")');
    length = builder.length;

    var plus = '$output+=';
    var output = 'var $s=this;var $output="";';
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
        var helper = 'helpers.encode(@)';
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
            if (index !== -1) {
                helper = cmd.substring(index + 1).trim();
                cmd = cmd.substring(0, index);
                index = helper.indexOf('(');
                var name = helper;
                if (index === -1)
                    helper += '(@)';
                else {
                    name = helper.substring(0, index);
                    helper = helper.substring(0, index + 1) + '@' + (helper.indexOf('()') === -1 ? ',' : '') + helper.substring(index + 1);
                }

                helper = 'helpers.' + helper;
                if (Thelpers[name] === undefined)
                    throw new Error('Helper: "' + name + '" not found.');
            }
            index = helper.indexOf('(');
            helper = helper.substring(0, index) + '.call($s,' + helper.substring(index + 1);
            cmd = helper.replace('@', Tangular.append(cmd, skip, isEach).trim());
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
        return new Function('helpers', output + ';return $output;').call(model, Thelpers);
    };
}

Tangular.append = function(line, skip, each) {

    var builder = [];
    var params = line.split(' ');

    if (skip === undefined)
        skip = [];

    var sl = skip.length;

    for (var i = 0, length = params.length; i < length; i++) {
        var param = params[i];
        var code = param.charCodeAt(0);

        if ((code > 64 && code < 91) || (code > 96 && code < 123) || (code === 36 || code === 95 || code === 33)) {

            var param5 = param.substring(0, 5);

            if (param.substring(0, 2) === 'if' || param5 === 'endif' || param5 === 'else' || param.substring(0, 6) === 'endfor' || param.substring(0, 7) === 'foreach') {
                builder.push(param);
                continue;
            }

            var negative = param.substring(0, 1) === '!';
            var skipnow = false;

            if (negative)
                param = param.substring(1);

            for (var j = 0; j < sl; j++) {
                var l = skip[j].length;
                if (param.substring(0, l) !== skip[j])
                    continue;
                if (param.length !== l) {
                    var c = param.substring(l, l + 1);
                    if (c !== '.' && c !== '+')
                        continue;
                }
                skipnow = true;
                break;
            }

            if (skipnow) {
                builder.push((negative ? '!' : '') + param);
                continue;
            }

            if (each && param.match(/^\$index(\s|$)/g) !== null) {
                builder.push((negative ? '!' : '') + param);
                continue;
            }

            builder.push((negative ? '!' : '') + '$s.' + param);
            continue;
        }

        builder.push(param);
    }

    return builder.join(' ');
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