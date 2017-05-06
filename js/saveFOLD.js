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

    var filename = $("#foldFilename").val();
    if (filename == "") filename = globals.filename;

    var json = {
        file_spec: 1,
        file_creator: "Origami Simulator: http://git.amandaghassaei.com/OrigamiSimulator/",
        file_author: $("#foldAuthor").val(),
        frame_title: filename,
        frame_classes: ["singleModel"],
        frame_attributes: ["3D"],
        frame_description: "",
        frame_unit: globals.foldUnits,
        vertices_coords: [],
        edges_vertices: [],
        edges_foldAngles: [],
        faces_vertices: []
    };

    var blob = new Blob([JSON.stringify(json, null, 4)], {type: 'application/octet-binary'});
    saveAs(blob, filename + ".fold");
}