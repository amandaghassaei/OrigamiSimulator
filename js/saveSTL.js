/**
 * Created by amandaghassaei on 5/2/17.
 */

function saveSTL(){

    var geo = globals.model.getGeometry().clone();
    if (geo.vertices.length == 0) {
        globals.warn("No geometry to save.");
        return;
    }
    if (!globals.doublesidedSTL){
        for (var i=0;i<geo.faces.length/2;i++){
            geo.faces.pop();
        }
    }

    var data = [];
    data.push({geo: geo, offset:new THREE.Vector3(0,0,0), orientation:new THREE.Quaternion(0,0,0,1)});
    var stlBin = geometryToSTLBin(data);
    if (!stlBin) return;
    var blob = new Blob([stlBin], {type: 'application/octet-binary'});
    saveAs(blob, globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded.stl");
    $("#exportSTLModal").modal("hide");
}