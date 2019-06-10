/**
 * Created by amandaghassaei on 5/6/17.
 */

// try to get rid of this import
import * as THREE from "../import/three.module";

function saveFOLD() {

  const geo = new THREE.Geometry().fromBufferGeometry(globals.model.getGeometry());

  if (geo.vertices.length === 0 || geo.faces.length === 0) {
    globals.warn("No geometry to save.");
    return;
  }

  if (globals.exportScale !== 1) {
    for (let i = 0; i < geo.vertices.length; i += 1) {
      geo.vertices[i].multiplyScalar(globals.exportScale);
    }
  }

  let filename = $("#foldFilename").val();
  if (filename === "") filename = globals.filename;

  const json = {
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

  for (let i = 0; i < geo.vertices.length; i += 1) {
    const vertex = geo.vertices[i];
    json.vertices_coords.push([vertex.x, vertex.y, vertex.z]);
  }

  const useTriangulated = globals.triangulateFOLDexport;
  const fold = globals.pattern.getFoldData(!useTriangulated);
  json.edges_vertices = fold.edges_vertices;
  const assignment = [];
  for (let i = 0; i < fold.edges_assignment.length; i += 1) {
    if (fold.edges_assignment[i] === "C") assignment.push("B");
    else assignment.push(fold.edges_assignment[i]);
  }
  json.edges_assignment = assignment;
  json.faces_vertices = fold.faces_vertices;

  if (globals.exportFoldAngle) {
    json.edges_foldAngle = fold.edges_foldAngle;
  }

  const blob = new Blob([JSON.stringify(json, null, 4)], { type: "application/octet-binary" });
  saveAs(blob, filename + ".fold");
}

export default saveFOLD;
