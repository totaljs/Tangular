[![MIT License][license-image]][license-url]
# Tangular
> A simple template engine like Angular.js for JavaScript or node.js

- only __3.0 kB__
- syntax like __Angular.js__ templates
- supports custom helpers
- supports conditions (+ nested conditions)
- supports loops (+ nested loops)
- no dependencies
- IE `>= 9`
- best of use with [www.totaljs.com - web application framework for node.js](http://www.totaljs.com)
- Live example on [JSFiddle / Tangular](http://jsfiddle.net/petersirka/ftfvba65/2/)
- [__DEMO EXAMPLE__](http://example.jcomponent.org)

```bash
npm install tangular
```

__YOU MUST SEE:__

- [jComponent - A component library for jQuery](https://github.com/petersirka/jComponent)
- [jRouting - HTML 5 routing via History API](https://github.com/petersirka/jRouting)
- [jQuery two way bindings](https://github.com/petersirka/jquery.bindings)

## Example

```javascript
var output = Tangular.render('Hello {{name}} and {{name | raw}}!', { name: '<b>world</b>' });
// Hello &lt;b&gt;world&lt;/b&gt; and <b>world</b>!
```

## Best performance with pre-compile

```javascript
// cache
var template = Tangular.compile('Hello {{name}} and {{name | raw}}!');

// render
var output = template({ name: 'Peter' });
```

## Conditions

```html
{{if name.length > 0}}
    <div>OK</div>
{{else}}
    <div>NO</div>
{{fi}}
```

```html
{{if name !== null}}
    <div>NOT NULL</div>
{{fi}}
```

## Looping

```html
{{foreach m in orders}}
    <h2>Order num.{{m.number}} (current index: {{$index}})</h2>
    <div>{{m.name}}</div>
{{end}}
```

## Custom helpers

```javascript
Tangular.register('currency', function(value, decimals) {
    // this === MODEL/OBJECT
    // console.log(this);
    // example
    return value.format(decimals || 0);
});

// Calling custom helper in JavaScript, e.g.:
Tangular.helpers.currency(100, 2);
```

```html
<div>{{ amount | currency }}</div>
<div>{{ amount | currency(2) }}</div>
```

## Built-in helpers

```html
<div>{{ name }} = VALUE IS ENCODED BY DEFAULT</div>
<div>{{ name | raw }} = VALUE IS NOT ENCODED</div>
```

## Contact

Peter Širka - www.petersirka.eu / <petersirka@gmail.com>

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt
