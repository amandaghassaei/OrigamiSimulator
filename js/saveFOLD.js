/**
 * Created by amandaghassaei on 5/6/17.
 */

function saveFOLD(){

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

    // var data = [];
    // data.push({geo: geo, offset:new THREE.Vector3(0,0,0), orientation:new THREE.Quaternion(0,0,0,1)});
    // var stlBin = geometryToSTLBin(data);
    // if (!stlBin) return;
    // var blob = new Blob([stlBin], {type: 'application/octet-binary'});
    var filename = $("#foldFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".fold");
}