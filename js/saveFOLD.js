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
        frame_unit: globals.foldUnits,
        vertices_coords: [],
        edges_vertices: [],
        edges_assignment: [],
        faces_vertices: []
    };

    for (var i=0;i<geo.vertices.length;i++){
        var vertex = geo.vertices[i];
        json.vertices_coords.push([vertex.x, vertex.y, vertex.z]);
    }

    var edges = globals.pattern.getAllEdges();
    for (var i=0;i<edges.mountains.length;i++){
        var nodes = edges.mountains[i];
        json.edges_vertices.push([nodes[0], nodes[1]]);
        json.edges_assignment.push("M");
    }
    for (var i=0;i<edges.valleys.length;i++){
        var nodes = edges.valleys[i];
        json.edges_vertices.push([nodes[0], nodes[1]]);
        json.edges_assignment.push("V");
    }
    for (var i=0;i<edges.cuts.length;i++){
        var nodes = edges.cuts[i];
        json.edges_vertices.push([nodes[0], nodes[1]]);
        json.edges_assignment.push("B");
    }
    for (var i=0;i<edges.outlines.length;i++){
        var nodes = edges.outlines[i];
        json.edges_vertices.push([nodes[0], nodes[1]]);
        json.edges_assignment.push("B");
    }

    if (globals.triangulateFOLDexport){
        for (var i=0;i<edges.triangulations.length;i++){
            var nodes = edges.triangulations[i];
            json.edges_vertices.push([nodes[0], nodes[1]]);
            json.edges_assignment.push("F");
        }
        for (var i=0;i<geo.faces.length;i++){
            var face = geo.faces[i];
            json.faces_vertices.push([face.a, face.b, face.c]);
        }
    } else {
        var polys = globals.pattern.getPolygons();
        for (var i=0;i<polys.length;i++){
            var poly = polys[i].slice();
            poly.pop();
            json.faces_vertices.push(poly);
        }
    }

    if (globals.exportFoldAngle){
        var foldAngles = [];
        //todo target fold angles or current?
        json.edges_foldAngles = foldAngles;
    }

    var blob = new Blob([JSON.stringify(json, null, 4)], {type: 'application/octet-binary'});
    saveAs(blob, filename + ".fold");
}