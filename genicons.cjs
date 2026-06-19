const sharp = require('sharp');
const petals = Array.from({length:12},(_,i)=>i*30).map(a=>
  `<ellipse cx="0" cy="-104" rx="39" ry="83" fill="#ffffff" stroke="#f0e0d0" stroke-width="6" transform="rotate(${a})"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f9d83"/>
  <g transform="translate(256 256)">${petals}
  <circle cx="0" cy="0" r="70" fill="#f4a93b" stroke="#e08a1e" stroke-width="10"/></g></svg>`;
const buf = Buffer.from(svg);
(async()=>{
  await sharp(buf).resize(512,512).png().toFile('public/icon-512.png');
  await sharp(buf).resize(192,192).png().toFile('public/icon-192.png');
  await sharp(buf).resize(192,192).png().toFile('public/apple-touch-icon.png');
  console.log('iconos OK');
})();
