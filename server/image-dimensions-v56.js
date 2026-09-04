'use strict';

// Read only dimensions for the three allowed image formats. Never decode pixels
// or dispatch to parsers for untrusted, unsupported file types. Every loop moves
// forward, has a fixed iteration bound, and checks lengths before reading.
function imageDimensions(bytes,mime){
  if(!Buffer.isBuffer(bytes)||bytes.length<12||bytes.length>6_000_000)throw Error('Invalid image');
  const result=(width,height,type)=>{
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>65535||height>65535)throw Error('Invalid dimensions');
    return {width,height,type};
  };
  if(mime==='png'){
    if(bytes.length<33||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG');
    return result(bytes.readUInt32BE(16),bytes.readUInt32BE(20),'png');
  }
  if(mime==='jpg'||mime==='jpeg'){
    if(bytes.readUInt16BE(0)!==0xffd8)throw Error('Invalid JPEG');
    let offset=2;
    const frames=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
    for(let segments=0;segments<4096&&offset+4<=bytes.length;segments++){
      if(bytes[offset++]!==0xff)throw Error('Invalid JPEG marker');
      // Fill bytes are allowed, but the input and iteration bounds remain fixed.
      while(offset<bytes.length&&bytes[offset]===0xff)offset++;
      if(offset+3>bytes.length)break;
      const marker=bytes[offset++];
      if(marker===0xda||marker===0xd9)break;
      if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
      const length=bytes.readUInt16BE(offset);
      if(length<2||offset+length>bytes.length)throw Error('Invalid JPEG segment');
      if(frames.has(marker)){
        if(length<8)throw Error('Invalid JPEG frame');
        return result(bytes.readUInt16BE(offset+5),bytes.readUInt16BE(offset+3),'jpg');
      }
      offset+=length;
    }
    throw Error('Missing JPEG dimensions');
  }
  if(mime==='webp'){
    if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||bytes.length<20)throw Error('Invalid WebP');
    const end=bytes.readUInt32LE(4)+8;
    if(end>bytes.length||end<20)throw Error('Truncated WebP');
    const type=bytes.toString('ascii',12,16),length=bytes.readUInt32LE(16);
    if(length>end-20)throw Error('Invalid WebP chunk');
    if(type==='VP8X'&&length>=10){
      // Animated images have additional frames outside a single-image budget.
      if(bytes[20]&2)throw Error('Animated WebP is unsupported');
      return result(1+bytes.readUIntLE(24,3),1+bytes.readUIntLE(27,3),'webp');
    }
    if(type==='VP8L'&&length>=5&&bytes[20]===0x2f){
      const bits=bytes.readUInt32LE(21);
      return result(1+(bits&0x3fff),1+((bits>>>14)&0x3fff),'webp');
    }
    if(type==='VP8 '&&length>=10&&!(bytes[20]&1)&&bytes.toString('hex',23,26)==='9d012a')return result(bytes.readUInt16LE(26)&0x3fff,bytes.readUInt16LE(28)&0x3fff,'webp');
  }
  throw Error('Unsupported image');
}
module.exports={imageDimensions};
