const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const coordtransform=require('../dist/vendor/coordtransform.js');
const context={coordtransform};vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../dist/map-provider.js'),'utf8')+';globalThis.coordinates=MapCoordinates;',context);
const coords=context.coordinates;
// Reference published by coordtransform upstream, ordered longitude/latitude.
const ref=coords.toMap([39.915,116.404]);
assert.ok(Math.abs(ref[0]-116.41024449916938)<1e-9);
assert.ok(Math.abs(ref[1]-39.91640428150164)<1e-9);
for(const r of require('../dist/places.json').records){
 const back=coords.fromMap(coords.toMap([r.lat,r.lon]));
 assert.ok(Math.abs(back[0]-r.lat)<1e-6&&Math.abs(back[1]-r.lon)<1e-6,r.id);
}
const london=coords.toMap([51.5074,-0.1278]);assert.equal(london[0],-0.1278);assert.equal(london[1],51.5074);
console.log('Coordinate reference, all42 round trips and outside-China identity passed');
