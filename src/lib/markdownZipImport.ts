import { inflateRawSync } from 'node:zlib';
export interface MarkdownZipFile { path: string; content: string }
const MAX_FILES=100,MAX_UNCOMPRESSED=25*1024*1024,MAX_FILE_SIZE=5*1024*1024;
function crc32(data:Buffer):number{let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
export function extractMarkdownFilesFromZip(input:Buffer):MarkdownZipFile[]{
 if(input.length<22)throw new Error('The ZIP archive is empty or invalid.');
 const min=Math.max(0,input.length-22-65535);let eocd=-1;for(let i=input.length-22;i>=min;i--){if(input.readUInt32LE(i)===0x06054b50){eocd=i;break;}}
 if(eocd<0)throw new Error('Invalid ZIP archive: end-of-directory record not found.');
 const disk=input.readUInt16LE(eocd+4),cdDisk=input.readUInt16LE(eocd+6),onDisk=input.readUInt16LE(eocd+8),count=input.readUInt16LE(eocd+10),size=input.readUInt32LE(eocd+12),start=input.readUInt32LE(eocd+16),comment=input.readUInt16LE(eocd+20);
 if(disk||cdDisk||onDisk!==count||count===0xffff||start===0xffffffff||size===0xffffffff||eocd+22+comment>input.length||start+size>eocd)throw new Error('Multi-disk, ZIP64, or malformed ZIP archives are not supported.');
 if(count>MAX_FILES)throw new Error('ZIP archives can contain at most 100 entries.');
 const files:MarkdownZipFile[]=[],seen=new Set<string>();let offset=start,total=0;
 for(let i=0;i<count;i++){
  if(offset+46>input.length||input.readUInt32LE(offset)!==0x02014b50)throw new Error('Invalid ZIP archive: corrupt file directory.');
  const madeBy=input.readUInt16LE(offset+4),flags=input.readUInt16LE(offset+8),method=input.readUInt16LE(offset+10),crc=input.readUInt32LE(offset+16),cs=input.readUInt32LE(offset+20),us=input.readUInt32LE(offset+24),nl=input.readUInt16LE(offset+28),el=input.readUInt16LE(offset+30),cl=input.readUInt16LE(offset+32),attrs=input.readUInt32LE(offset+38),lo=input.readUInt32LE(offset+42);
  const end=offset+46+nl+el+cl;if(end>input.length)throw new Error('Invalid ZIP archive: truncated file entry.');
  const name=input.subarray(offset+46,offset+46+nl).toString('utf8');offset=end;if(!name||name.endsWith('/'))continue;
  const path=name.replace(/\\/g,'/');
  if(path.startsWith('/')||/^[a-zA-Z]:/.test(path)||path.split('/').some(p=>p==='..'||p==='.' ))throw new Error('ZIP contains an unsafe file path.');
  if(!/\.md$/i.test(path))continue;
  if(seen.has(path.toLowerCase()))throw new Error('ZIP contains duplicate Markdown file paths.');seen.add(path.toLowerCase());
  if(flags&1)throw new Error('Password-protected ZIP files are not supported.');
  if(method!==0&&method!==8)throw new Error('ZIP uses an unsupported compression method.');
  if(us>MAX_FILE_SIZE)throw new Error('Each Markdown file must be 5 MB or smaller.');
  total+=us;if(total>MAX_UNCOMPRESSED)throw new Error('Extracted Markdown content must be 25 MB or smaller in total.');
  const mode=(madeBy>>8)===3?attrs>>>16:0;if((mode&0xf000)===0xa000)throw new Error('ZIP symbolic links are not allowed.');
  if(lo+30>input.length||input.readUInt32LE(lo)!==0x04034b50)throw new Error('Invalid ZIP archive: corrupt local file header.');
  const ds=lo+30+input.readUInt16LE(lo+26)+input.readUInt16LE(lo+28),de=ds+cs;if(ds>input.length||de>input.length)throw new Error('Invalid ZIP archive: truncated file content.');
  let content:Buffer;try{const raw=input.subarray(ds,de);content=method===0?Buffer.from(raw):inflateRawSync(raw,{maxOutputLength:MAX_FILE_SIZE});}catch{throw new Error('A Markdown file in the ZIP could not be extracted.');}
  if(content.length!==us||crc32(content)!==crc)throw new Error('ZIP file integrity check failed. Please re-create the archive and try again.');
  const text=content.toString('utf8');if(text.includes('\u0000'))throw new Error('A Markdown file contains invalid binary content.');files.push({path,content:text});
 }
 if(!files.length)throw new Error('The ZIP archive must contain at least one .md file.');
 return files.sort((a,b)=>a.path.localeCompare(b.path,undefined,{numeric:true,sensitivity:'base'}));
}