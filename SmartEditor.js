/*!
 * SmartEditor v0.0.1 - jfdesgagne.com
 * Jean-François Desgagné (jfdesgagne@gmail.com)
 * MIT license
 * @preserve
 */

(function (window) {
    'use strict';

    /**
     * Class who wrap string that match regex.
     * Often used in element with contenteditable="true", to highlight some
     * specifics keys.
     *
     * @class SmartEditor wrap string matching regular expressions.
     * @param {DOM Element} el DOM Element that will highlight matched regexps.
     * @param {object} options See SmartEditor.defaults
     * @example
     *
     *  CSS:
     *      key.red {color:red;}
     *      key.green {color:green;}
     *
     *  HTML:
     *      <pre contenteditable="true" id="editor">${key1} and ${key3} will be green, ${key2} will be red</pre>
     *
     *  JavaScript:
     *      var greenKeys = ['key1', 'key3'];
     *      var editor = new SmartEditor('#editor', {
     *          regexps: {
     *              '(\\$\\{([a-zA-Z0-9-_]{1,60})\\})': function(key) {
     *                  return (linkedKeys.indexOf(key) > -1) ? 'green' : 'red';
     *              }
     *          }
     *      });
     *
     */
    var SmartEditor = function SmartEditor(el, options) {
        if (window.jQuery === undefined) {
            throw new Error('jQuery is required with SmartEditor');
        }
        if(typeof el == 'string') el = $(el);
        this._el = (el instanceof window.jQuery) ? el.get(0) : el;
        this._$el = (el instanceof window.jQuery) ? el : window.jQuery(this._el);

        this._invalidateBinded = this.invalidate.bind(this);
        this._$el.on('keyup paste', this._invalidateBinded);

        this.updateOptions(options); //will call render
    };

    SmartEditor.defaults = {
        timeout: 500,
        tagname: 'key',
        onTextChanged: null,

        //Regexp backslash need to be double escaped as they are part of a string
        regexps : {
            '(\\$\\{([a-zA-Z0-9-_]{1,60})\\})': 'unlinked'
        }
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof window.define === 'function' && window.define.amd) {
        window.define(['jquery'], function () {return SmartEditor;});
    } else {
        window.SmartEditor = SmartEditor;
    }

    SmartEditor.prototype = {
        destroy: function () {
            //remove added HTML tags
            this._$el.html(this._$el.html().replace(/<(?:.|\n)*?>/gm, ''));

            //clear events & timers
            this._$el.off('keyup paste',  this._invalidateBinded);
            this.clearTimer();

            //variable release
            this._el = this._$el = null;
            this.options = null;
        },
        setContent: function(content) {
            this._$el.text(content);
            this.render(true);
        },
        getContent: function() {
            return this._$el.text();
        },
        invalidate: function () {
            this.clearTimer();
            this._timer = window.setTimeout(this.render.bind(this), this.options.timeout);
        },
        clearTimer: function () {
            window.clearTimeout(this._timer);
            this._timer = null;
        },
        updateOptions: function (options) {
            this.options = Object.create(SmartEditor.defaults);

            if(options) {
                var i;
                for (i in options) {
                    if(options.hasOwnProperty(i)) {
                        this.options[i] = options[i];
                    }
                }
            }

            //update regexps
            this._regexps = [];
            for (i in this.options.regexps) {
                this._regexps.push({
                    regexp_global: new RegExp(i, 'gi'),
                    regexp: new RegExp('^' + i + '$'),
                    className: this.options.regexps[i]
                });
            }

            this.render(true);
        },

        /*
         * The render, every times it run, remove all the <key>, and readd them. I found that
         * it was much faster than trying to figured out which one are no good, and remove them.
         */
        render: function (ignoreChanges) {
            var text            = this._$el.html(),
                newText         = text.replace(/<(?:.|\n)*?>/gm, ''), //strip HTML tags (will remove every <key> ... will be readed after)
                match           = null,
                regexp          = null,
                i               = null,
                savedSelection  = null;
            
            //re-adding the tags
            for (i in this._regexps) {
                if(this._regexps.hasOwnProperty(i)) {
                    regexp = this._regexps[i].regexp_global;
                    regexp.lastIndex = 0;
                    while ((match = regexp.exec(newText))) {
                        //make sure that text isn't already wrapped
                        if (!isCharWrapped(newText, match.index)) {
                            var oldTextLength = newText.length;
                            newText = insertString(newText, '</' + this.options.tagname + '>', match.index + match[0].length);

                            var className = this._regexps[i].className;
                            if (typeof className === 'function') {
                                className = className(match[0]);
                            }
                            newText = insertString(newText, '<' + this.options.tagname  + (className ? ' class="' + className + '"' : '') + '>', match.index);
                            //adjust the cursor to the length of the added tags
                            regexp.lastIndex += newText.length - oldTextLength;
                        }
                    }
                }
            }

            //If they are any new or removed tag, we will update the text and restore the selection
            if (newText != text) {
                savedSelection = saveSelection(this._el);
                this._$el.html(newText);
                if(savedSelection) {
                    restoreSelection(this._el, savedSelection);
                }            
            }

            if(this.options.onTextChanged && !ignoreChanges) {
                this.options.onTextChanged(newText);
            }
        }
    };


    /*
     * Utils functions
     */
    var grabKey = function(e){
        if(event.keyCode == 9) { //TAB key
            //document.execCommand('styleWithCSS', true, null);
            document.execCommand('indent', true, null);

            if(event.preventDefault) {
                event.preventDefault();
            }
        }
    },

    insertString = function (string, newString, index) {
        return (index > 0) ? string.substring(0, index) + newString + string.substring(index, string.length) : newString + string;
    },

    isCharWrapped = function (text, index) {
        var lgtIndex = text.lastIndexOf('<', index);
        return (lgtIndex > -1 && text.substring(lgtIndex+1, lgtIndex+2) != '/');
    };

    var saveSelection, restoreSelection;
    if (window.getSelection && document.createRange) {
        saveSelection = function (containerEl) {
            if (document.activeElement != containerEl) return;
            var range = window.getSelection().getRangeAt(0);
            var preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(containerEl);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            var start = preSelectionRange.toString().length;

            return {
                start: start,
                end: start + range.toString().length
            };
        };

        restoreSelection = function (containerEl, savedSel) {
            var charIndex = 0, range = document.createRange();
            range.setStart(containerEl, 0);
            range.collapse(true);
            var nodeStack = [containerEl], node, foundStart = false, stop = false;

            while (!stop && (node = nodeStack.pop())) {
                if (node.nodeType == 3) {
                    var nextCharIndex = charIndex + node.length;
                    if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
                        range.setStart(node, savedSel.start - charIndex);
                        foundStart = true;
                    }
                    if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
                        range.setEnd(node, savedSel.end - charIndex);
                        stop = true;
                    }
                    charIndex = nextCharIndex;
                } else {
                    var i = node.childNodes.length;
                    while (i--) {
                        nodeStack.push(node.childNodes[i]);
                    }
                }
            }

            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        };
    } else if (document.selection) {
        saveSelection = function (containerEl) {
            var selectedTextRange = document.selection.createRange();
            var preSelectionTextRange = document.body.createTextRange();
            preSelectionTextRange.moveToElementText(containerEl);
            preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
            var start = preSelectionTextRange.text.length;

            return {
                start: start,
                end: start + selectedTextRange.text.length
            };
        };

        restoreSelection = function (containerEl, savedSel) {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(containerEl);
            textRange.collapse(true);
            textRange.moveEnd("character", savedSel.end);
            textRange.moveStart("character", savedSel.start);
            textRange.select();
        };
    }
}.call(this, window));