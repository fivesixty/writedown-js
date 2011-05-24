var Writedown = (function () {

var sd = new wShowdown.converter();

sd.config.figures = true;
sd.config.tables = true;

var blockRules = {
  start: [ { // normal header
    regex: "^#.+$",
    name: "header",
    noconcat: true
  }, { // references (doesn't support multi-line yet)
    name : "metadata",
    regex : "^[ ]{0,3}\\[[^\\]]+\\]:\\s*.+$",
    noconcat: true
  }, { // HR *
    name : "hr",
    regex : "^[ ]{0,2}(?:[ ]?\\*[ ]?){3,}[ \\t]*$",
    noconcat: true
  }, { // HR -
    name : "hr",
    regex : "^[ ]{0,2}(?:[ ]?\\-[ ]?){3,}[ \\t]*$",
    noconcat: true
  }, { // HR _
    name : "hr",
    regex : "^[ ]{0,2}(?:[ ]?\\_[ ]?){3,}[ \\t]*$",
    noconcat: true
  }, {
    name : "ghcodeblock",
    regex : "^[`]{3}",
    next: "ghcodeblock"
  }, {
    name : "codeblock",
    regex : "^(?=[ ]{4})",
    next: "codeblock"
  }, {
    name : "tabcodeblock",
    regex : "^(?=\\t)",
    next: "tabcodeblock"
  }, { // list
    regex: "^(?=(?:[-*+]|\\d\\.)(?: |\\t))",
    name: "list",
    next: "listblock"
  }, {
    regex: "^(?=[ ]{0,3}>)",
    name: "blockquote",
    next: "bq"
  }, {
    regex: "^(?=.+$)",
    look: function (line, nextline) {
      if (/^[=]+\s*$/.test(nextline)) {
        return {
          name: "header",
          value: "# " + line
        }
      }
      return {
        name: "paragraph",
        next: "p"
      }
    }
  }, {
    regex: "(?=.+)",
    name: "paragraph",
    next: "p"
  } ],
  listblock: [ {
    regex: "^$",
    name: "listbody"
  }, {
    regex: "^(?!\\s|[-*+][\\s\\t]|\\d\.)|(?=[ ]{0,2}(?:[ ]?\\*[ ]?){3,}[ \\t]*$|[ ]{0,2}(?:[ ]?\\-[ ]?){3,}[ \\t]*|[ ]{0,2}(?:[ ]?\\_[ ]?){3,}[ \\t]*$)",
    name: "endlist",
    next: "start"
  }, {
    regex: ".+$",
    name: "listbody"
  } ],
  p: [ {
    regex: "^$",
    next: "start",
    noconcat: true
  }, {
    regex: ".+$",
    name: "pbody"
  } ],
  ghcodeblock: [ {
    regex: "^[`]{3}",
    next: "start"
  }, {
    name: "ghcodeblock",
    regex: ".+"
  } ],
  codeblock: [ {
    regex: "^(?=[ ]{0,3}(?:[^ ]|$))",
    next: "start"
  }, {
    name: "codeblock",
    regex: ".+"
  } ],
  tabcodeblock: [ {
    regex: "^(?=[^\\t])",
    next: "start"
  }, {
    name: "codeblock",
    regex: ".+"
  } ],
  bq: [ {
    regex: "^\\s*$",
    next: "start"
  }, {
    regex: ".+$",
    name: "blockquote"
  } ]
}

var Writedown = function (doc) {
  if (!doc) doc = "";
  this.setDoc(doc);
  this.parseBlocks();
};

(function () {
  
  function ComposeMachine(machine) {
    var matchers = {};

    // Compose machine.
    for (var key in machine) {
      var regexps = [];
      for (var i = 0; i < machine[key].length; i++) {
        regexps.push(machine[key][i].regex);
      }
      matchers[key] = new RegExp("(?:(" + regexps.join(")|(") + ")|(.))", "g");
    }
    return {rules:machine, matchers:matchers};
  }
  
  this.machine = ComposeMachine(blockRules);
  
  this.parseBlocks = function () {
    this.runMachine();
    this.TranslateBlocks();
  }
  
  this.setDoc = function (doc) {
    this.doc = this.prepareDoc(doc);
    this.context = {
      urls: {},
      titles: {},
      html_blocks: [],
      link_refs: {},
      print_refs: {},
      print_refs_count: 0,
      dirtyrefs: {}
    };
    this.blocks = [];
    this.dirtyrefs = true;
  }
  
  var wsreplace = /(^[ \t]+$)|(\r\n|\r)/gm;
  var wsproc = function (match, m1, m2) {
    if (m1) return "";
    return "\n";
  }
  
  this.prepareDoc = function (doc) {
    return doc.replace(wsreplace,wsproc).replace(/^\n+|\n+$/g,"").split("\n");
  }
  
  this.makeHtml = function (doc) {
    if (doc) {
      this.setDoc(doc);
      this.parseBlocks();
    }
    return this.blocksToHTML();
  }
  
  this.updateDoc = function (newContent) {
    var newdoc = this.prepareDoc(newContent);
    var max = Math.max(newdoc.length, this.doc.length);
    var delta = newdoc.length - this.doc.length;
    var blockindex = 0;
    var i = 0;
    if (this.blocks.length >= 2) {
      var nextBlock = this.blocks[blockindex+1].startline;
      for (i = 0; i < max; i++) {
        if (newdoc[i] !== this.doc[i]) {
          break;
        }
        if (i >= nextBlock) {
          blockindex++;
          if (!this.blocks[blockindex+1]) {
            break;
          }
          nextBlock = this.blocks[blockindex+1].startline;
        }
      }
    }
    this.doc = newdoc;
    if (this.blocks.length > 0) {
      var params = {
        line: this.blocks[blockindex].startline,
        blockIndex: blockindex,
        delta: delta,
        diffline: i
      };
    } else {
      var params = false;
      this.dirtyrefs = true;
    }
    this.runMachine(params);
    this.TranslateBlocks();
  }
  
  this.TranslateBlocks = function() {
    if (!this.dirtyrefs) return;
    
    var blocks = this.blocks;
    var context = this.context;
    
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].type === "metadata") {
        var match = /\[(.+)\]:[ \t]*\n?[ \t]*<?(\S+)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+)[")][ \t]*)?/gm.exec(blocks[i].value);
        var id = match[1].toLowerCase();
        var url = sd._EncodeAmpsAndAngles(match[2]);  // Link IDs are case-insensitive
        
        if (url !== context.urls[id]) {
          // console.log("Changed url on ", id, [url], context.urls[id]);
          context.dirtyrefs[id] = true;
          context.urls[id] = url;
        }
        if (match[4]) {
          var title = match[4].replace(/"/g,"&quot;");
          if (title !== context.titles[id]) {
            // console.log("Changed title on ", id, [title], context.titles[id]);
            context.dirtyrefs[id] = true;
            context.titles[id] = title;
          }
        } else {
          if (context.titles[id]) {
            // console.log("Removed title on ", id);
            context.titles[id] = null;
            context.dirtyrefs[id] = true;
          }
        }
      }
    }
    this.dirtyrefs = false;
  }
  
  this.blocksToHTML = function () {
    var blocks = this.blocks;
    var context = this.context;

    var translated = [];
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].type === "metadata") continue;
      var recache = blocks[i].dirty;
      
      if (!recache) {
        for (var key in blocks[i].refs) {
          if (blocks[i].refs.hasOwnProperty(key)) {
            if (context.dirtyrefs[key]) {
              recache = true;
            }
          }
        }
      }
      
      if (recache) {
        // console.log("Caching dirty block " + i + ".");
        
        var content = "";
        if (blocks[i].type === "hr") {
          content = "\n<hr />\n";
        } else if (blocks[i].type === "header") {
          content = sd._DoHashHeaders(blocks[i].value + "\n");
        } else if (blocks[i].type === "codeblock") {  
          content = sd._Detab(blocks[i].value);
          content = sd._EncodeCode(sd._Outdent(content), true);

          content = content.replace(/^\n+/g,"").replace(/\n+$/g,""); // trim surrounding newlines

          content = "<pre><code>" + content + "\n</code></pre>";
        } else {
          content = sd.makeHtml(blocks[i].value, context);
          if (blocks[i].type === "listbody") {
            content = "\n"+content+"\n";
          }
        }
        blocks[i].html = content;
        blocks[i].refs = context.link_refs;
        blocks[i].dirty = false;
        context.html_blocks = [];
        context.link_refs = [];
      }
      
      if (blocks[i].html) {
        translated.push(blocks[i].html);
      }
    }
    context.dirtyrefs = {};
    return translated.join("\n");
  }
  
  this.runMachine = function (partial) {
    var lines = this.doc;
    var matchers = this.machine.matchers;
    machine = this.machine.rules;
  
    var state = "start";
    var statestack = [];
    var re = matchers[state];
    var tokens = [];
    
    if (!partial) {
      var startPoint = 0;
    } else {
      var startPoint = partial.line;
      var blockIndex = partial.blockIndex;
    }
    
    var token = {
        type: null,
        value: "",
        startline: startPoint,
        dirty: true
    };
    
    var escape = false;
    var type;
    var noconcat;
    for (var i = startPoint; i < lines.length; i++) {
      re.lastIndex = 0;
      lastIndex = 0;
      var match;
      var line = lines[i];
      while (!escape && (match = re.exec(line))) {
        value = match[0];
      
        for (var j = 0; j < match.length-2; j++) {
          if (match[j + 1] !== undefined) {
            var rule = machine[state][j];
            var next = false;
            var settype = false;
            noconcat = rule.noconcat;
          
            if (rule.look) {
              var res = rule.look(line, lines[i+1]);
              if (res.value) {
                type = res.name;
                value = res.value;
                settype = true;
                escape = true;
              } else {
                next = "p";
              }
            }
          
            if (next || machine[state][j].next) {
              state = next || machine[state][j].next;
              lastIndex = re.lastIndex;
              re = matchers[state];
              re.lastIndex = lastIndex;
            } else if (!settype) {
              type = rule.name;
              lastIndex = re.lastIndex;
            }
            break;
          }
        }
      
        if (token.type !== type || noconcat) {
          if (token.type) {
            token.value = token.value.replace(/^\n+/g,"").replace(/\n+$/g,""); // trim surrounding newlines
          }
          if (token.value) {
            if (partial && i >= partial.diffline) {
              var k = partial.blockIndex, l;
              
              for (; k < this.blocks.length; k++) {
                var matching = false;
                if (token.value === this.blocks[k].value && this.blocks[k].startline+partial.delta === token.startline) {
                  matching = true;
                  break;
                } else if (this.blocks[k].startline+partial.delta > token.startline) {
                  break;
                }
              }
              if (matching) {
                // console.log("Splicing in new blocks from " + args[0] + " to " + args[1]);
                for (var i = 0; i < tokens.length; i++) {
                  if (tokens[i].type === "metadata") {
                    this.dirtyrefs = true;
                    break;
                  }
                }
                for (var i = partial.blockIndex; i < k; i++) {
                  if (this.blocks[i].type === "metadata") {
                    this.dirtyrefs = true;
                    break;
                  }
                }
                for (var i = k; i < this.blocks.length; i++) {
                  if (this.blocks[i].startline >= partial.diffline) {
                    this.blocks[i].startline += partial.delta;
                  }
                }
                // var args = [partial.blockIndex, k].concat(tokens);
                this.spliceBlocks(partial.blockIndex, k, tokens);
                // Array.prototype.splice.apply(this.blocks, args);
                return;
              }
            }
            
            if (partial && this.blocks[partial.blockIndex] && this.blocks[partial.blockIndex].value === token.value && tokens.length == 0) {
              partial.blockIndex++;
            } else {
              if (token.type)
                tokens.push(token);
            }
          }
          token = {
            type: type,
            value: value,
            startline: i,
            dirty: true
          }
        } else {
          token.value += value;
        }
        if (re.lastIndex == line.length)
          break;
        lastIndex = re.lastIndex;
      }
      if (escape) {
        i++;
        escape = false;
      }
      token.value += "\n";
    }
  
    if (token.type && token.value) {
      token.value = token.value.replace(/^\n+/g,"").replace(/\n+$/g,""); // trim surrounding newlines
      tokens.push(token);
    }
    
    if (!partial)
      this.blocks = tokens;
    else {
      // console.log("Splicing in new blocks from " + args[0] + " to " + args[1]);
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].type === "metadata") {
          this.dirtyrefs = true;
          break;
        }
      }
      for (var i = partial.blockIndex; i < this.blocks.length; i++) {
        if (this.blocks[i].type === "metadata") {
          this.dirtyrefs = true;
          break;
        }
      }
      var args = [partial.blockIndex, this.blocks.length].concat(tokens);
      this.spliceBlocks(partial.blockIndex, this.blocks.length, tokens);
      //Array.prototype.splice.apply(this.blocks, args);
    }
  }
  
  this.spliceBlocks = function(from, n, blocks) {
    var i, j;
    for (i = from, j = 0; i < n; i++, j++) {
      if (!blocks[j]) {
        break;
      }
      if (this.blocks[i].value !== blocks[j].value) {
        break;
      }
    }
    blocks = blocks.slice(j);
    var args = [from+j, n].concat(blocks);
    Array.prototype.splice.apply(this.blocks, args);
  }
  
}).call(Writedown.prototype);


return Writedown;
}());