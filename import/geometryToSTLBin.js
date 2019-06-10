// Written by Paul Kaplan

export default function (geometryArray) {
  const writeVector = function (dataview, bufferIndex, vector, offset, orientation, isLittleEndian) {
    vector = vector.clone();
    if (orientation) vector.applyQuaternion(orientation);
    if (offset) vector.add(offset);
    bufferIndex = writeFloat(dataview, bufferIndex, vector.x, isLittleEndian);
    bufferIndex = writeFloat(dataview, bufferIndex, vector.y, isLittleEndian);
    return writeFloat(dataview, bufferIndex, vector.z, isLittleEndian);
  };

  const writeFloat = function (dataview, bufferIndex, float, isLittleEndian) {
    dataview.setFloat32(bufferIndex, float, isLittleEndian);
    return bufferIndex + 4;
  };


  let isLittleEndian = true; // STL files assume little endian, see wikipedia page
  let floatData = [];

  for (let index = 0; index < geometryArray.length; index += 1) {

    let geometry = geometryArray[index].geo;
    let orientation = geometryArray[index].orientation;
    let offset = geometryArray[index].offset;

    if (geometry instanceof THREE.BufferGeometry) {

      let normals = geometry.attributes.normal.array;
      let vertices = geometry.attributes.position.array;
      for (let n = 0; n < vertices.length; n += 9) {
        let normal = new THREE.Vector3(normals[n], normals[n + 1], normals[n + 2]);
        let verta = new THREE.Vector3(vertices[n], vertices[n + 1], vertices[n + 2]);
        let vertb = new THREE.Vector3(vertices[n + 3], vertices[n + 4], vertices[n + 5]);
        let vertc = new THREE.Vector3(vertices[n + 6], vertices[n + 7], vertices[n + 8]);
        floatData.push([normal, verta, vertb, vertc, offset, orientation]);
      }

    } else {

      let tris = geometry.faces;
      let verts = geometry.vertices;

      for(let n = 0; n < tris.length; n += 1) {
        floatData.push([tris[n].normal, verts[tris[n].a], verts[tris[n].b], verts[tris[n].c], offset, orientation]);
      }
    }
  }

  if (floatData.length === 0) {
    console.warn("no data to write to stl");
    return null;
  }

  //write to DataView
  let bufferSize = 84 + (50 * floatData.length);
  let buffer = new ArrayBuffer(bufferSize);
  let dv = new DataView(buffer);
  let bufferIndex = 0;

  bufferIndex += 80; // Header is empty

  dv.setUint32(bufferIndex, floatData.length, isLittleEndian);
  bufferIndex += 4;

  for (let i = 0; i < floatData.length; i += 1) {
    bufferIndex = writeVector(dv, bufferIndex, floatData[i][0], null, floatData[i][5], isLittleEndian);
    for (let j = 1; j < 4; j += 1) {
      bufferIndex = writeVector(dv, bufferIndex, floatData[i][j], floatData[i][4], floatData[i][5], isLittleEndian);
    }
    bufferIndex += 2; // unused 'attribute byte count' is a Uint16
  }

  return dv;
};
