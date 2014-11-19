[![MIT License][license-image]][license-url]

# Tangular - A simple template engine like Angular.js for JavaScript or node.js

- syntax like __Angular.js__ templates
- supports custom helpers
- supports conditions (+ nested conditions)
- supports simple looping (doesn't support nested looping)
- no dependencies
- 4 kB minified
- best of use with www.totaljs.com - web application framework for node.js
- Live example on [JSFiddle / Tangular](http://jsfiddle.net/petersirka/ftfvba65/)

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
var output = Tangular.render(template);
```

## Conditions

```html
{{if name.length > 0}}
    <div>OK</div>
{{else}}
    <div>NO</div>
{{endif}}
```

```html
{{if name !== null}}
    <div>NOT NULL</div>
{{endif}}
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
    // example
    return value.format(decimals || 0);
});
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
[license-url]: LICENSE