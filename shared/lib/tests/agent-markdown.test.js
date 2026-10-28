import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { agentMarkdown, publicReadme } from '../agent-markdown.js';
test('source links resolve to the repo, external and in-document links survive', () => {
  assert.equal(publicReadme('[doc](docs/guide.md) ![image](docs/preview.png) [same](#x) [external](https://example.com)', 'https://github.com/o/r/blob/main/apps/game/'), '[doc](https://github.com/o/r/blob/main/apps/game/docs/guide.md) ![image](https://github.com/o/r/blob/main/apps/game/docs/preview.png) [same](#x) [external](https://example.com)');
});
test('every emitted HTML route gets a current source guide and discovery', () => {
  const dir=mkdtempSync(path.join(tmpdir(),'game-markdown-'));
  try {
    writeFileSync(path.join(dir,'meta.json'),JSON.stringify({title:'Guide',description:'Current game'}));
    writeFileSync(path.join(dir,'README.md'),'# Guide\n\nNew instruction from source.');
    const plugin=agentMarkdown({appDir:dir,origin:'https://example.com',sourceURL:'https://github.com/o/r/blob/main/'});
    const files=[];
    plugin.generateBundle.call({emitFile:f=>files.push(f)}, {}, {'index.html':{},'showroom.html':{},'game.js':{}});
    assert.deepEqual(files.map(f=>f.fileName),['index.md','showroom.md','llms.txt','_headers']);
    assert.ok(files.find(f=>f.fileName==='showroom.md').source.includes('https://example.com/showroom.html'));
    assert.ok(files[0].source.includes('New instruction from source.'));
    assert.ok(files[2].source.includes('/showroom.md'));
    assert.ok(files[3].source.includes('text/markdown'));
    const tags=plugin.transformIndexHtml.handler('<title>Guide</title>',{filename:path.join(dir,'showroom.html')}).tags;
    assert.equal(tags[0].attrs.href,'./showroom.md');
    writeFileSync(path.join(dir,'README.md'),'# Changed instructions');
    const changed=[];plugin.generateBundle.call({emitFile:f=>changed.push(f)}, {}, {'index.html':{}});
    assert.ok(changed[0].source.includes('# Changed instructions'));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
