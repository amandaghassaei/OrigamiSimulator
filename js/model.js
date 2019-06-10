/**
 * Created by amandaghassaei on 2/24/17.
 */

// model updates object3d geometry and materials

import * as THREE from "../import/three.module";
import Node from "./node";
import Beam from "./beam";
import Crease from "./crease";

function initModel(globals) {

  let material;
  let material2;
  let geometry;
  const frontside = new THREE.Mesh(); // front face of mesh
  const backside = new THREE.Mesh(); // back face of mesh (different color)
  backside.visible = false;

  // #145685 blue
  // #edb31c yellow
  // #e64e1e red

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
    transparent: true,
    opacity: 0.3
  });
  const hingeLines = new THREE.LineSegments(null, lineMaterial);
  const mountainLines = new THREE.LineSegments(null, lineMaterial);
  const valleyLines = new THREE.LineSegments(null, lineMaterial);
  const cutLines = new THREE.LineSegments(null, lineMaterial);
  const facetLines = new THREE.LineSegments(null, lineMaterial);
  const borderLines = new THREE.LineSegments(null, lineMaterial);

  const lines = {
    U: hingeLines,
    M: mountainLines,
    V: valleyLines,
    C: cutLines,
    F: facetLines,
    B: borderLines
  };

  clearGeometries();
  setMeshMaterial();

  function clearGeometries() {

    if (geometry) {
      frontside.geometry = null;
      backside.geometry = null;
      geometry.dispose();
    }

    geometry = new THREE.BufferGeometry();
    frontside.geometry = geometry;
    backside.geometry = geometry;
    // geometry.verticesNeedUpdate = true;
    geometry.dynamic = true;

    Object.values(lines).forEach((line) => {
      let lineGeometry = line.geometry;
      if (lineGeometry) {
        line.geometry = null;
        lineGeometry.dispose();
      }

      lineGeometry = new THREE.BufferGeometry();
      line.geometry = lineGeometry;
      // lineGeometry.verticesNeedUpdate = true;
      lineGeometry.dynamic = true;
    });
  }


  globals.threeView.sceneAddModel(frontside);
  globals.threeView.sceneAddModel(backside);
  Object.values(lines).forEach((line) => {
    globals.threeView.sceneAddModel(line);
  });

  let positions; // place to store buffer geo vertex data
  let colors; // place to store buffer geo vertex colors
  let indices;
  let nodes = [];
  let faces = [];
  let edges = [];
  let creases = [];
  let vertices = []; // indexed vertices array
  let fold;
  let creaseParams;

  let nextCreaseParams;
  let nextFold; // todo only nextFold, nextCreases?

  let inited = false;

  function setMeshMaterial() {
    let polygonOffset = 0.5;
    if (false) { // (globals.colorMode == "normal") {
      material = new THREE.MeshNormalMaterial({
        flatShading:true,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
        polygonOffsetUnits: 1
      });
      backside.visible = false;
    } else if (globals.colorMode === "axialStrain") {
      material = new THREE.MeshBasicMaterial({
        vertexColors: THREE.VertexColors,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
        polygonOffsetUnits: 1
      });
      backside.visible = false;
      if (!globals.threeView.simulationRunning) {
        getSolver().render();
        setGeoUpdates();
      }
    } else {
      material = new THREE.MeshPhongMaterial({
        flatShading: true,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
        polygonOffsetUnits: 1,
        // transparent: true,
        // opacity: 0.3,
        // dithering:true,
        shininess: 1,
        specular: 0xffffff,
        reflectivity: 0
      });
      material2 = new THREE.MeshPhongMaterial({
        flatShading: true,
        side: THREE.BackSide,
        polygonOffset: true,
        polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
        polygonOffsetUnits: 1,
        // transparent: true,
        // opacity: 0.3,
        // dithering:true,
        shininess: 1,
        specular: 0xffffff,
        reflectivity: 0
      });

      // material = new THREE.MeshPhysicalMaterial( {
      //     map: null,
      //     color: 0x0000ff,
      //     metalness: 0.2,
      //     roughness: 0.6,
      //     side: THREE.FrontSide,
      //     transparent: false,
      //     envMapIntensity: 5,
      //     premultipliedAlpha: true
      //     // TODO: Add custom blend mode that modulates background color by this materials color.
      // } );

      // material2 = new THREE.MeshPhysicalMaterial( {
      //     map: null,
      //     color: 0xffffff,
      //     metalness: 0.2,
      //     roughness: 0.6,
      //     side: THREE.BackSide,
      //     transparent: false,
      //     envMapIntensity: 5,
      //     premultipliedAlpha: true
      //     // TODO: Add custom blend mode that modulates background color by this materials color.
      // } );

      material.color.setStyle(`#${globals.color1}`);
      material2.color.setStyle(`#${globals.color2}`);
      backside.visible = true;
    }
    frontside.material = material;
    backside.material = material2;
    frontside.material.needsUpdate = true;
    backside.material.needsUpdate = true;
    // frontside.material.depthWrite = false;
    // backside.material.depthWrite = false;

    frontside.castShadow = true;
    frontside.receiveShadow = true;
    // backside.castShadow = true;
    // backside.receiveShadow = true;
  }

  function updateEdgeVisibility() {
    mountainLines.visible = globals.edgesVisible && globals.mtnsVisible;
    valleyLines.visible = globals.edgesVisible && globals.valleysVisible;
    facetLines.visible = globals.edgesVisible && globals.panelsVisible;
    hingeLines.visible = globals.edgesVisible && globals.passiveEdgesVisible;
    borderLines.visible = globals.edgesVisible && globals.boundaryEdgesVisible;
    cutLines.visible = false;
  }

  function updateMeshVisibility() {
    frontside.visible = globals.meshVisible;
    backside.visible = globals.colorMode === "color" && globals.meshVisible;
  }

  function getGeometry() {
    return geometry;
  }

  function getMesh() {
    return [frontside, backside];
  }

  function getPositionsArray() {
    return positions;
  }

  function getColorsArray() {
    return colors;
  }

  function pause() {
    globals.threeView.pauseSimulation();
  }

  function resume() {
    globals.threeView.startSimulation();
  }

  function reset() {
    getSolver().reset();
    setGeoUpdates();
  }

  function step(numSteps) {
    getSolver().solve(numSteps);
    setGeoUpdates();
  }

  function setGeoUpdates() {
    geometry.attributes.position.needsUpdate = true;
    if (globals.colorMode == "axialStrain") geometry.attributes.color.needsUpdate = true;
    if (globals.userInteractionEnabled || globals.vrEnabled) geometry.computeBoundingBox();
  }

  function startSolver() {
    globals.threeView.startAnimation();
  }

  function getSolver() {
    if (globals.simType === "dynamic") return globals.dynamicSolver;
    if (globals.simType === "static") return globals.staticSolver;
    return globals.rigidSolver;
  }

  function buildModel(buildFold, buildCreaseParams) {
    if (buildFold.vertices_coords.length === 0) {
      globals.warn("No geometry found.");
      return;
    }
    if (buildFold.faces_vertices.length === 0) {
      globals.warn("No faces found, try adjusting import vertex merge tolerance.");
      return;
    }
    if (buildFold.edges_vertices.length === 0) {
      globals.warn("No edges found.");
      return;
    }

    nextFold = buildFold;
    nextCreaseParams = buildCreaseParams;

    globals.needsSync = true;
    globals.simNeedsSync = true;

    if (!inited) {
      startSolver(); // start animation loop
      inited = true;
    }
  }

  function sync() {
    for (let i = 0; i < nodes.length; i += 1) {
      nodes[i].destroy();
    }
    for (let i = 0; i < edges.length; i += 1) {
      edges[i].destroy();
    }
    for (let i = 0; i < creases.length; i += 1) {
      creases[i].destroy();
    }

    fold = nextFold;
    nodes = [];
    edges = [];
    faces = fold.faces_vertices;
    creases = [];
    creaseParams = nextCreaseParams;
    const _edges = fold.edges_vertices;

    const _vertices = [];
    for (let i = 0; i < fold.vertices_coords.length; i += 1) {
      const vertex = fold.vertices_coords[i];
      _vertices.push(new THREE.Vector3(vertex[0], vertex[1], vertex[2]));
    }

    for (let i = 0; i < _vertices.length; i += 1) {
      nodes.push(new Node(_vertices[i].clone(), nodes.length));
    }
    // _nodes[_faces[0][0]].setFixed(true);
    // _nodes[_faces[0][1]].setFixed(true);
    // _nodes[_faces[0][2]].setFixed(true);

    for (let i = 0; i < _edges.length; i += 1) {
      edges.push(new Beam(globals, [nodes[_edges[i][0]], nodes[_edges[i][1]]]));
    }

    for (let i = 0; i < creaseParams.length; i += 1) { // allCreaseParams.length
      const _creaseParams = creaseParams[i]; // face1Ind, vert1Ind, face2Ind, ver2Ind, edgeInd, angle
      const type = _creaseParams[5] !== 0 ? 1 : 0;
      // edge, face1Index, face2Index, targetTheta, type, node1, node2, index
      creases.push(new Crease(globals, edges[_creaseParams[4]], _creaseParams[0], _creaseParams[2], _creaseParams[5], type, nodes[_creaseParams[1]], nodes[_creaseParams[3]], creases.length));
    }

    vertices = [];
    for (let i = 0; i < nodes.length; i += 1) {
      vertices.push(nodes[i].getOriginalPosition());
    }

    if (globals.noCreasePatternAvailable() && globals.navMode === "pattern") {
      // switch to simulation mode
      // $("#svgViewer").hide();
      globals.navMode = "simulation";
    }

    positions = new Float32Array(vertices.length * 3);
    colors = new Float32Array(vertices.length * 3);
    indices = new Uint16Array(faces.length * 3);

    for (let i = 0; i < vertices.length; i += 1) {
      positions[3 * i] = vertices[i].x;
      positions[3 * i + 1] = vertices[i].y;
      positions[3 * i + 2] = vertices[i].z;
    }
    for (let i = 0; i < faces.length; i += 1) {
      const face = faces[i];
      indices[3 * i] = face[0];
      indices[3 * i + 1] = face[1];
      indices[3 * i + 2] = face[2];
    }

    clearGeometries();

    const positionsAttribute = new THREE.BufferAttribute(positions, 3);

    const lineIndices = {
      U: [],
      V: [],
      M: [],
      B: [],
      F: [],
      C: []
    };
    for (let i = 0; i < fold.edges_assignment.length; i += 1) {
      const edge = fold.edges_vertices[i];
      const assignment = fold.edges_assignment[i];
      lineIndices[assignment].push(edge[0]);
      lineIndices[assignment].push(edge[1]);
    }
    Object.keys(lines).forEach((key) => {
      const line = lines[key];
      const indicesArray = lineIndices[key];
      const uIndices = new Uint16Array(indicesArray.length);
      for (let i = 0; i < indicesArray.length; i += 1) {
        uIndices[i] = indicesArray[i];
      }
      lines[key].geometry.addAttribute("position", positionsAttribute);
      lines[key].geometry.setIndex(new THREE.BufferAttribute(uIndices, 1));
      // lines[key].geometry.attributes.position.needsUpdate = true;
      // lines[key].geometry.index.needsUpdate = true;
      lines[key].geometry.computeBoundingBox();
      lines[key].geometry.computeBoundingSphere();
      lines[key].geometry.center();
    });

    geometry.addAttribute("position", positionsAttribute);
    geometry.addAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    // geometry.attributes.position.needsUpdate = true;
    // geometry.index.needsUpdate = true;
    // geometry.verticesNeedUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.center();

    const scale = 1 / geometry.boundingSphere.radius;
    globals.scale = scale;

    // scale geometry
    for (let i = 0; i < positions.length; i += 1) {
      positions[i] *= scale;
    }
    for (let i = 0; i < vertices.length; i += 1) {
      vertices[i].multiplyScalar(scale);
    }

    // update vertices and edges
    for (let i = 0; i < vertices.length; i += 1) {
      nodes[i].setOriginalPosition(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
    }
    for (let i = 0; i < edges.length; i += 1) {
      edges[i].recalcOriginalLength();
    }

    updateEdgeVisibility();
    updateMeshVisibility();

    syncSolver();

    globals.needsSync = false;
    if (!globals.simulationRunning) reset();
  }

  function syncSolver() {
    getSolver().syncNodesAndEdges();
    globals.simNeedsSync = false;
  }

  function getNodes() {
    return nodes;
  }

  function getEdges() {
    return edges;
  }

  function getFaces() {
    return faces;
  }

  function getCreases() {
    return creases;
  }

  function getDimensions() {
    geometry.computeBoundingBox();
    return geometry.boundingBox.max.clone().sub(geometry.boundingBox.min);
  }

  return {
    pause,
    resume,
    reset,
    step,

    getNodes,
    getEdges,
    getFaces,
    getCreases,
    getGeometry, // for save stl
    getPositionsArray,
    getColorsArray,
    getMesh,

    buildModel, // load new model
    sync, // update geometry to new model
    syncSolver, // update solver params

    // rendering
    setMeshMaterial,
    updateEdgeVisibility,
    updateMeshVisibility,

    getDimensions // for save stl
  };
}

export default initModel;
