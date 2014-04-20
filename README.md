smarteditor.js
==============

Class who wrap string that match regex. Is dependent of  jQuery $el.html() and $el.text(). This class if often used in a contenteditable="true" context.


## Example Of Use

CSS: 
```css 
key.red {color:red;}
key.green {color:green;}
```
HTML:
```html
<pre contenteditable="true" id="editor">${key1} and ${key3} will be green, ${key2} will be red</pre>
```
  
JavaScript:
```js
var greenKeys = ['key1', 'key3'];
var editor = new SmartEditor('#editor', {
  regexps: {
    '(\\$\\{([a-zA-Z0-9-_]{1,60})\\})': function(key) {
      return (linkedKeys.indexOf(key) > -1) ? 'green' : 'red';
    }
  }
});
``` 

## Api
```js
var editor = new SmartEditor(el, options);
```
   
Update the text inside the editor. Will also trigger a render()
```js
editor.setContent(content);
```
   
