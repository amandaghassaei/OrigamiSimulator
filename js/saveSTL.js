/**
 * Created by amandaghassaei on 5/2/17.
 */

function makeSaveGEO(doublesided){
    var geo = new THREE.Geometry().fromBufferGeometry( globals.model.getGeometry() );

    if (geo.vertices.length == 0 || geo.faces.length == 0) {
        globals.warn("No geometry to save.");
        return;
    }

    for (var i=0;i<geo.vertices.length;i++){
        geo.vertices[i].multiplyScalar(globals.exportScale/globals.scale);
    }


    if (globals.thickenModel){
        var numVertices = geo.vertices.length;
        geo.computeVertexNormals();
        geo.computeFaceNormals();
        for (var i=0;i<numVertices;i++){
            var face;
            var vertexNormal = new THREE.Vector3();
            var lastFaceIndex = 0;
            for (var j=0;j<geo.faces.length;j++){
                face = geo.faces[j];
                if (face.a == i || face.b == i || face.c == i) {
                    vertexNormal.add(face.normal);
                    lastFaceIndex = j;
                }
                // if (vertexNormal !== null) break;
            }
            // if (vertexNormal === undefined) {
            //     geo.vertices.push(new THREE.Vector3());
            //     continue;
            // }
            vertexNormal.normalize();
            console.log(vertexNormal);
            var offset = vertexNormal.clone().multiplyScalar(globals.thickenOffset/(2*vertexNormal.clone().dot(geo.faces[lastFaceIndex].normal)));

            geo.vertices.push(geo.vertices[i].clone().sub(offset));
            geo.vertices[i].add(offset);
        }
        var numFaces = geo.faces.length;
        for (var i=0;i<numFaces;i++){
            var face = geo.faces[i].clone();
            face.a += numVertices;
            face.b += numVertices;
            face.c += numVertices;
            var b = face.b;
            face.b = face.c;
            face.c = b;
            geo.faces.push(face);
        }
        geo.computeVertexNormals();
        geo.computeFaceNormals();



    } else if (doublesided){
        var numFaces = geo.faces.length;
        for (var i=0;i<numFaces;i++){
            var face = geo.faces[i];
            geo.faces.push(new THREE.Face3(face.a, face.c, face.b));
        }
    }

    return geo;
}

function saveSTL(){

    var data = [];
    data.push({geo: makeSaveGEO(globals.doublesidedSTL), offset:new THREE.Vector3(0,0,0), orientation:new THREE.Quaternion(0,0,0,1)});
    var stlBin = geometryToSTLBin(data);
    if (!stlBin) return;
    var blob = new Blob([stlBin], {type: 'application/octet-binary'});
    var filename = $("#stlFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".stl");
}

function saveOBJ(){
    var exporter = new THREE.OBJExporter();
    var result = exporter.parse (new THREE.Mesh(makeSaveGEO(globals.doublesidedOBJ)));
    if (!result) return;
    var blob = new Blob([result], {type: 'application/octet-binary'});
    var filename = $("#objFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".obj");
}