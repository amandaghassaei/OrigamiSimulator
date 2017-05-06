/**
 * Created by amandaghassaei on 5/2/17.
 */

function saveSTL(){

    var geo = new THREE.Geometry().fromBufferGeometry( globals.model.getGeometry() );

    if (geo.vertices.length == 0 || geo.faces.length == 0) {
        globals.warn("No geometry to save.");
        return;
    }

    if (globals.stlScale != 1){
        for (var i=0;i<geo.vertices.length;i++){
            geo.vertices[i].multiplyScalar(globals.stlScale);
        }
    }

    if (globals.doublesidedSTL){
        var numFaces = geo.faces.length;
        for (var i=0;i<numFaces;i++){
            var face = geo.faces[i];
            geo.faces.push(new THREE.Face3(face.a, face.c, face.b));
        }
    }

    var data = [];
    data.push({geo: geo, offset:new THREE.Vector3(0,0,0), orientation:new THREE.Quaternion(0,0,0,1)});
    var stlBin = geometryToSTLBin(data);
    if (!stlBin) return;
    var blob = new Blob([stlBin], {type: 'application/octet-binary'});
    var filename = $("#stlFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".stl");
}