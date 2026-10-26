import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { extractMarkdownFilesFromZip } from '../src/lib/markdownZipImport';
function crc32(data:Buffer):number{let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function makeZip(entries:Array<{name:string;text:string}>):Buffer{
 const locals:Buffer[]=[],centrals:Buffer[]=[];let offset=0;
 for(const e of entries){const name=Buffer.from(e.name),data=Buffer.from(e.text),compressed=deflateRawSync(data),crc=crc32(data);
 const local=Buffer.alloc(30+name.length);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x0800,6);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);name.copy(local,30);locals.push(local,compressed);
 const central=Buffer.alloc(46+name.length);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(0x0314,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x0800,8);central.writeUInt16LE(8,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);name.copy(central,46);centrals.push(central);offset+=local.length+compressed.length;}
 const localData=Buffer.concat(locals),centralData=Buffer.concat(centrals),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(entries.length,8);e.writeUInt16LE(entries.length,10);e.writeUInt32LE(centralData.length,12);e.writeUInt32LE(localData.length,16);return Buffer.concat([localData,centralData,e]);
}
const files=extractMarkdownFilesFromZip(makeZip([{name:'chapters/chapter-10.md',text:'# Chapter 10\n\nTen'},{name:'cover.txt',text:'ignored'},{name:'chapters/chapter-2.md',text:'# Chapter 2\n\nTwo'}]));
assert.equal(files.length,2);assert.equal(files[0].path,'chapters/chapter-2.md');assert.match(files[1].content,/Chapter 10/);
assert.throws(()=>extractMarkdownFilesFromZip(Buffer.from('not a zip')),/invalid|ZIP/i);
assert.throws(()=>extractMarkdownFilesFromZip(makeZip([{name:'../escape.md',text:'bad'}])),/unsafe file path/i);
console.log('Markdown ZIP import tests passed.');