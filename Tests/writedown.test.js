var writedown = new Writedown();
var showdown = new Showdown.converter();

showdown.config.figures = true;
showdown.config.tables = true;

function markdownTest(name, md) {
  asyncTest(name, function () {
    var firstload = false;
    var html = "";
    var text = "";
    var rawtext = "";
    $.get(name + '.text', function (data) {
      rawtext = data;
      text = $.trim(md.makeHtml(data)).replace(/>\s*\n*\s*</g, "><");
      if (!firstload) {
        firstload = true;
      } else {
        equals(text, html, name);
        var testcase1 = rawtext + "\n\n# New Header";
        var testcase2 = "# New Header\n\n" + rawtext;
        var baseresult = writedown.makeHtml(rawtext);
        var testresult1 = writedown.makeHtml(testcase1);
        var testresult2 = writedown.makeHtml(testcase2);
        
        JSLitmus.test(name + " showdown", function () {
          testresult1 = showdown.makeHtml(rawtext + "\n\n# New Header");
        });
        
        JSLitmus.test(name + " writedown full", function () {
          testresult1 = writedown.makeHtml(rawtext + "\n\n# New Header");
        });
        JSLitmus.test(name + " writedown append+revert", function () {
          writedown.updateDoc(testcase1);
          if (writedown.makeHtml() !== testresult1) {
            throw "WOAH";
          }
          writedown.updateDoc(rawtext);
          if (writedown.makeHtml() !== baseresult) {
            throw "OOAH";
          }
        });
        JSLitmus.test(name + " writedown prepend+revert", function () {
          writedown.updateDoc(testcase2);
          if (writedown.makeHtml() !== testresult2) {
            throw "WOAH";
          }
          writedown.updateDoc(rawtext);
          if (writedown.makeHtml() !== baseresult) {
            throw "OOAH";
          }
        });
        start();
      }
    });
    $.get(name + '.html', function (data) {
      html = $.trim(data).replace(/>\s*\n*\s*</g, "><");
      if (!firstload) {
        firstload = true;
      } else {
        equals(text, html, name);
        var testcase1 = rawtext + "\n\n# New Header";
        var testcase2 = "# New Header\n\n" + rawtext;
        var baseresult = writedown.makeHtml(rawtext);
        var testresult1 = writedown.makeHtml(testcase1);
        var testresult2 = writedown.makeHtml(testcase2);
        
        JSLitmus.test(name + " showdown", function () {
          testresult1 = showdown.makeHtml(rawtext + "\n\n# New Header");
        });
        
        JSLitmus.test(name + " writedown full", function () {
          testresult1 = writedown.makeHtml(rawtext + "\n\n# New Header");
        });
        JSLitmus.test(name + " writedown append+revert", function () {
          writedown.updateDoc(testcase1);
          if (writedown.makeHtml() !== testresult1) {
            throw "WOAH";
          }
          writedown.updateDoc(rawtext);
          if (writedown.makeHtml() !== baseresult) {
            throw "OOAH";
          }
        });
        JSLitmus.test(name + " writedown prepend+revert", function () {
          writedown.updateDoc(testcase2);
          if (writedown.makeHtml() !== testresult2) {
            throw "WOAH";
          }
          writedown.updateDoc(rawtext);
          if (writedown.makeHtml() !== baseresult) {
            throw "OOAH";
          }
        });
        start();
      }
    });
  });
}

module("markdown test suite");

var tests = ["Amps and angle encoding", "Auto links", "Backslash escapes",
  "Blockquotes with code blocks", "Code Blocks", "Code Spans",
  "Hard-wrapped paragraphs with list-like lines", "Horizontal rules", "Images",
  "Inline HTML (Advanced)", "Inline HTML (Simple)", "Inline HTML comments",
  "Links, inline style", "Links, reference style", "Links, shortcut references",
  "Literal quotes in titles", "Markdown Documentation - Basics",
  "Markdown Documentation - Syntax",
  "Nested blockquotes", "Ordered and unordered lists", "Strong and em together",
  "Tabs", "Tidyness"];
 
$.each(tests, function (i, name) {
  markdownTest(name, writedown);
});

module("extensions test suite");

var ext_tests = ["Figures", "Tables"];

$.each(ext_tests, function (i, name) {
  markdownTest(name, writedown);
});