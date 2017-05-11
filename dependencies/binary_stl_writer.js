// Written by Paul Kaplan


var geometryToSTLBin = function(geometryArray) {

    var writeVector = function(dataview, bufferIndex, vector, offset, orientation, isLittleEndian) {
        vector = vector.clone();
        if (orientation) vector.applyQuaternion(orientation);
        if (offset) vector.add(offset);
        bufferIndex = writeFloat(dataview, bufferIndex, vector.x, isLittleEndian);
        bufferIndex = writeFloat(dataview, bufferIndex, vector.y, isLittleEndian);
        return writeFloat(dataview, bufferIndex, vector.z, isLittleEndian);
    };

    var writeFloat = function(dataview, bufferIndex, float, isLittleEndian) {
        dataview.setFloat32(bufferIndex, float, isLittleEndian);
        return bufferIndex + 4;
    };


    var isLittleEndian = true; // STL files assume little endian, see wikipedia page
    var floatData = [];

    for (var index = 0;index<geometryArray.length;index++){

        var geometry = geometryArray[index].geo;
        var orientation = geometryArray[index].orientation;
        var offset = geometryArray[index].offset;

        if (geometry instanceof THREE.BufferGeometry){

            var normals = geometry.attributes.normal.array;
            var vertices = geometry.attributes.position.array;
            for (var n=0;n<vertices.length;n+=9){
                var normal = new THREE.Vector3(normals[n], normals[n+1], normals[n+2]);
                var verta = new THREE.Vector3(vertices[n], vertices[n+1], vertices[n+2]);
                var vertb = new THREE.Vector3(vertices[n+3], vertices[n+4], vertices[n+5]);
                var vertc = new THREE.Vector3(vertices[n+6], vertices[n+7], vertices[n+8]);
                floatData.push([normal, verta, vertb, vertc, offset, orientation]);
            }

        } else {

            var tris = geometry.faces;
            var verts = geometry.vertices;

            for(var n = 0; n < tris.length; n++) {
                floatData.push([tris[n].normal, verts[tris[n].a], verts[tris[n].b], verts[tris[n].c], offset, orientation]);
            }
        }
    }

    if (floatData.length == 0){
        console.warn("no data to write to stl");
        return null;
    }

    //write to DataView
    var bufferSize = 84 + (50 * floatData.length);
    var buffer = new ArrayBuffer(bufferSize);
    var dv = new DataView(buffer);
    var bufferIndex = 0;

    bufferIndex += 80; // Header is empty

    dv.setUint32(bufferIndex, floatData.length, isLittleEndian);
    bufferIndex += 4;

    for (var i=0;i<floatData.length;i++){
        bufferIndex = writeVector(dv, bufferIndex, floatData[i][0], null, floatData[i][5], isLittleEndian);
        for (var j=1;j<4;j++){
            bufferIndex = writeVector(dv, bufferIndex, floatData[i][j], floatData[i][4], floatData[i][5], isLittleEndian);
        }
        bufferIndex += 2; // unused 'attribute byte count' is a Uint16
    }


    return dv;
};

