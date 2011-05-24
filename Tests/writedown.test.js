var writedown = new Writedown();
var showdown = new Showdown.converter();

function markdownTest(name, md) {
  asyncTest(name, function () {
    var firstload = false;
    var html = "";
    var text = "";
    $.get(name + '.text', function (data) {
      text = $.trim(md.makeHtml(data)).replace(/>\s*\n*\s*</g, "><");
      if (!firstload) {
        firstload = true;
      } else {
        equals(text, html, name);
        JSLitmus.test(name + " showdown", function () {
          showdown.makeHtml(text);
        });
        
        JSLitmus.test(name + " writedown", function () {
          writedown.makeHtml(text);
        });
        JSLitmus.test(name + " writedown partial", function () {
          writedown.updateDoc(text + "\n\n# New Header");
          writedown.makeHtml();
          writedown.updateDoc(text);
          writedown.makeHtml();
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
        JSLitmus.test(name + " showdown", function () {
          showdown.makeHtml(text);
        });
        
        JSLitmus.test(name + " writedown", function () {
          writedown.makeHtml(text);
        });
        JSLitmus.test(name + " writedown partial", function () {
          writedown.updateDoc(text + "\n\n# New Header");
          writedown.makeHtml();
          writedown.updateDoc(text);
          writedown.makeHtml();
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