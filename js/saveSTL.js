/**
 * Created by amandaghassaei on 5/2/17.
 */

function saveSTL(){

    var geo = globals.model.getGeometry();
    if (geo.vertices.length == 0) {
        globals.warn("No geometry to save.");
        return;
    }

    var data = [];
    data.push({geo: geo, offset:new THREE.Vector3(0,0,0), orientation:new THREE.Quaternion(0,0,0,1)});
    var stlBin = geometryToSTLBin(data);
    if (!stlBin) return;
    var blob = new Blob([stlBin], {type: 'application/octet-binary'});
    saveAs(blob, "Origami : " + parseInt(globals.creasePercent*100) +  "PercentFolded.stl");
}