/**
 * Created by amandaghassaei on 5/2/17.
 */

function makeSaveGEO(){
    var geo = new THREE.Geometry().fromBufferGeometry( globals.model.getGeometry() );

    if (geo.vertices.length == 0 || geo.faces.length == 0) {
        globals.warn("No geometry to save.");
        return;
    }

    if (globals.exportScale != 1){
        for (var i=0;i<geo.vertices.length;i++){
            geo.vertices[i].multiplyScalar(globals.exportScale);
        }
    }

    if (globals.doublesidedSTL){
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
    data.push({geo: makeSaveGEO(), offset:new THREE.Vector3(0,0,0), orientation:new THREE.Quaternion(0,0,0,1)});
    var stlBin = geometryToSTLBin(data);
    if (!stlBin) return;
    var blob = new Blob([stlBin], {type: 'application/octet-binary'});
    var filename = $("#stlFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".stl");
}

function saveOBJ(){
    var exporter = new THREE.OBJExporter();
    var result = exporter.parse (new THREE.Mesh(makeSaveGEO()));
    if (!result) return;
    var blob = new Blob([result], {type: 'application/octet-binary'});
    var filename = $("#objFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".obj");
}