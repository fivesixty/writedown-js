# writedown-js

This is an incremental parser for a variant of markdown. writedown-js was created due to the need to generate live previews of arbitrarily sized markdown documents, which became much slower under previous parse-all parsers.

It functions by splitting the document into blocks, and rendering each block individually as required by changes. Metadata changes are also used to trigger block redraws. It uses a modified and optimised Showdown renderer for rendering most blocks, but fast-renders those blocks it knows it is safe to do so (such as headings and code blocks).

## Compatibility

Compatible with showdown, with extensions from the [mdext](https://github.com/fivesixty/mdext) showdown fork.

## Performance

Rendering the Markdown Syntax page:

![Markdown Syntax render benchmark](http://i.imgur.com/yNrcJ.png)

Across all test cases (as a multiple of showdown performance):

![Relative Performance Benchmarks](http://i.imgur.com/F6DPd.png)