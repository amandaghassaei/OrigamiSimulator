/**
 * Created by amandaghassaei on 3/27/17.
 */

// const numeric = require("numeric"); // this is not the correct npm name.
// search npm for the right package, or rewrite to match a new package

import { Vector3 } from "../import/three.module";

function initStaticSolver() {
  let nodes;
  let edges;
  let faces;
  let creases;
  let positions;

  let Q;
  let C;
  let Ctrans;
  let F;
  let F_rxn;
  let Ctrans_Q;
  let Ctrans_Q_C;
  let numFreeEdges;
  let numVerticesFree;
  let numVerticesFixed;
  let numFreeCreases;
  let indicesMapping;
  let fixedIndicesMapping;
  let freeEdgesMapping;
  let freeCreasesMapping;

  function syncNodesAndEdges() {
    nodes = globals.model.getNodes();
    edges = globals.model.getEdges();
    faces = globals.model.getFaces();
    creases = globals.model.getCreases();

    positions = globals.model.getPositionsArray();

    setUpParams();
  }

  function solve() {
    updateMatrices();
    solveStep();
  }
  function reset() {
  }

  function pinv(A) { // for linearly ind rows
    const AT = numeric.transpose(A);
    return numeric.dot(AT, numeric.inv(numeric.dot(AT, A)));
  }

  function solveStep() {
    console.log("static solve");
    // if (fixedIndicesMapping.length == 0) {//no boundary conditions
    //     var X = initEmptyArray(numVerticesFree*3);
    //     render(X);
    //     console.warn("no boundary conditions");
    //     return;
    // }

    const _F = F.slice();
    for (let i = 0; i < _F.length; i += 1) {
      _F[i] += F_rxn[i];
    }
    const X = numeric.solve(Ctrans_Q_C, _F);
    // var sum = new Vector3();
    // for (var i = 0; i < _F.length;i+=3) {
    //     sum.x += _F[i];
    //     sum.y += _F[i+1];
    //     sum.z += _F[i+2];
    // }
    // console.log(sum);

    render(X);
  }

  function render(X) {
    for (let i = 0; i < numVerticesFree; i += 1) {
      const index = indicesMapping[i];
      const nodePosition = new Vector3(X[3*i], X[3*i+1], X[3*i+2]);
      const nexPos = nodes[index].renderDelta(nodePosition);
      positions[3 * index] = nexPos.x;
      positions[3 * index + 1] = nexPos.y;
      positions[3 * index + 2] = nexPos.z;
    }
    for (let i = 0; i < numVerticesFixed; i += 1) { // todo necessary?
      const index = fixedIndicesMapping[i];
      const nodePosition = new Vector3(0, 0, 0);
      const nexPos = nodes[index].render(nodePosition);
      positions[3 * index] = nexPos.x;
      positions[3 * index + 1] = nexPos.y;
      positions[3 * index + 2] = nexPos.z;
    }
    for (let i = 0; i < edges.length; i += 1) {
      edges[i].render();
    }
  }

  function initEmptyArray(dim1, dim2, dim3) {
    if (dim2 === undefined) dim2 = 0;
    if (dim3 === undefined) dim3 = 0;
    const array = [];
    for (let i = 0; i < dim1; i += 1) {
      if (dim2 === 0) array.push(0);
      else array.push([]);
      for (let j = 0; j < dim2; j += 1) {
        if (dim3 === 0) array[i].push(0);
        else array[i].push([]);
        for (let k = 0; k < dim3; k += 1) {
          array[i][j].push(0);
        }
      }
    }
    return array;
  }

  function updateMatrices() {
    calcCsAndRxns();
    Ctrans = numeric.transpose(C);
    // console.log(Q);
    Ctrans_Q = numeric.dot(Ctrans, Q);
    Ctrans_Q_C = numeric.dot(Ctrans_Q, C);
  }

  function setUpParams() {

    indicesMapping = [];
    fixedIndicesMapping = [];
    freeEdgesMapping = [];
    freeCreasesMapping = [];

    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i].fixed) fixedIndicesMapping.push(nodes[i].getIndex()); // todo need this?
      else indicesMapping.push(nodes[i].getIndex()); // todo push(i)
    }
    for (let i = 0; i < edges.length; i += 1) {
      if (edges[i].isFixed()) continue;
      freeEdgesMapping.push(i);
    }
    for (let i = 0; i < creases.length; i += 1) {
      freeCreasesMapping.push(i);
    }

    numVerticesFree = indicesMapping.length;
    numVerticesFixed = fixedIndicesMapping.length;
    numFreeEdges = freeEdgesMapping.length;
    numFreeCreases = freeCreasesMapping.length;


    // C = (edges + creases) x 3nodes
    // Q = (edges + creases) x (edges + creases)
    // Ctrans = 3nodes x (edges + creases)
    // disp = 1 x 3nodes

    Q = initEmptyArray(numFreeEdges + numFreeCreases, numFreeEdges + numFreeCreases);
    C = initEmptyArray(numFreeEdges + numFreeCreases, 3 * numVerticesFree);
    calcQ();

    F = initEmptyArray(numVerticesFree * 3);

    for (let i = 0; i < numVerticesFree; i += 1) {
      F[3 * i] = 0;
      F[3 * i + 1] = 0;
      F[3 * i + 2] = 0;
    }

    updateMatrices();
  }

  function calcCsAndRxns() {
    F_rxn = initEmptyArray(numVerticesFree * 3);
    for (let j = 0; j < numFreeEdges; j += 1) {
      const edge = edges[freeEdgesMapping[j]];
      const _nodes = edge.nodes;
      const edgeVector0 = edge.getVector(_nodes[0]);

      const length = edge.getOriginalLength();
      const diff = edgeVector0.length() - length;
      const rxnForceScale = globals.axialStiffness * diff / length;

      edgeVector0.normalize();
      if (!_nodes[0].fixed) {
        const i = indicesMapping.indexOf(_nodes[0].getIndex());
        C[j][3 * i] = edgeVector0.x;
        C[j][3 * i + 1] = edgeVector0.y;
        C[j][3 * i + 2] = edgeVector0.z;
        F_rxn[3 * i] -= edgeVector0.x * rxnForceScale;
        F_rxn[3 * i + 1] -= edgeVector0.y * rxnForceScale;
        F_rxn[3 * i + 2] -= edgeVector0.z * rxnForceScale;
      }
      if (!_nodes[1].fixed) {
        const i = indicesMapping.indexOf(_nodes[1].getIndex());
        C[j][3 * i] = -edgeVector0.x;
        C[j][3 * i + 1] = -edgeVector0.y;
        C[j][3 * i + 2] = -edgeVector0.z;
        F_rxn[3 * i] += edgeVector0.x * rxnForceScale;
        F_rxn[3 * i + 1] += edgeVector0.y * rxnForceScale;
        F_rxn[3 * i + 2] += edgeVector0.z * rxnForceScale;
      }
    }

    const geometry = globals.model.getGeometry();
    const indices = geometry.index.array;
    const normals = [];

    // compute all normals
    const cb = new Vector3();
    const ab = new Vector3();
    for (let j = 0; j < indices.length; j += 3) {
      let index = 3 * indices[j];
      const vA = new Vector3(positions[index], positions[index + 1], positions[index + 2]);
      index = 3 * indices[j + 1];
      const vB = new Vector3(positions[index], positions[index + 1], positions[index + 2]);
      index = 3 * indices[j + 2];
      const vC = new Vector3(positions[index], positions[index + 1], positions[index + 2]);
      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab);

      cb.normalize();
      normals.push(cb.clone());
    }


    // for (var j=0;j<numFreeCreases; j += 1) {
    //     var crease = creases[freeCreasesMapping[j]];
    //     var normal1 = normals[crease.face1Index];
    //     var normal2 = normals[crease.face2Index];
    //     var dotNormals = normal1.dot(normal2);
    //     if (dotNormals < -1.0) dotNormals = -1.0;
    //     else if (dotNormals > 1.0) dotNormals = 1.0;
    //
    //     var creaseVector = crease.getVector().normalize();
    //     //https://math.stackexchange.com/questions/47059/how-do-i-calculate-a-dihedral-angle-given-cartesian-coordinates
    //     var theta = Math.atan2((normal1.clone().cross(creaseVector)).dot(normal2), dotNormals);
    //
    //     var diff = theta - globals.creasePercent*crease.targetTheta;
    //     var rxnForceScale = crease.getK()*diff;
    //
    //     var partial1, partial2;
    //
    //     if (!crease.node1.fixed) {
    //         var i = indicesMapping.indexOf(crease.node1.getIndex());
    //         var dist = crease.getLengthToNode1();
    //         var partial1 = normal1.clone().divideScalar(dist);
    //         C[j+numFreeEdges][3*i] = partial1.x;
    //         C[j+numFreeEdges][3*i+1] = partial1.y;
    //         C[j+numFreeEdges][3*i+2] = partial1.z;
    //         F_rxn[3*i] -= partial1.x*rxnForceScale;
    //         F_rxn[3*i+1] -= partial1.y*rxnForceScale;
    //         F_rxn[3*i+2] -= partial1.z*rxnForceScale;
    //     }
    //     if (!crease.node2.fixed) {
    //         var i = indicesMapping.indexOf(crease.node2.getIndex());
    //         var dist = crease.getLengthToNode2();
    //         var partial2 = normal2.clone().divideScalar(dist);
    //         C[j+numFreeEdges][3*i] = partial2.x;
    //         C[j+numFreeEdges][3*i+1] = partial2.y;
    //         C[j+numFreeEdges][3*i+2] = partial2.z;
    //         F_rxn[3*i] -= partial2.x*rxnForceScale;
    //         F_rxn[3*i+1] -= partial2.y*rxnForceScale;
    //         F_rxn[3*i+2] -= partial2.z*rxnForceScale;
    //     }
    //     var creaseNodes = crease.edge.nodes;
    //     for (var k=0;k<creaseNodes.length;k++) {
    //         var node = creaseNodes[k];
    //         if (node.fixed) continue;
    //         var i = indicesMapping.indexOf(node.getIndex());
    //
    //         C[j+numFreeEdges][3*i] = -(partial1.x+partial2.x)/2;
    //         C[j+numFreeEdges][3*i+1] = -(partial1.y+partial2.y)/2;
    //         C[j+numFreeEdges][3*i+2] = -(partial1.z+partial2.z)/2;
    //         F_rxn[3*i] += (partial1.x+partial2.x)/2*rxnForceScale;
    //         F_rxn[3*i+1] += (partial1.y+partial2.y)/2*rxnForceScale;
    //         F_rxn[3*i+2] += (partial1.z+partial2.z)/2*rxnForceScale;
    //     }
    // }
  }

  function calcQ() {
    for (let i = 0; i < numFreeEdges; i += 1) {
      Q[i][i] = edges[freeEdgesMapping[i]].getK();
    }
    for (let i = 0; i < numFreeCreases; i += 1) {
      const crease = creases[freeCreasesMapping[i]];
      Q[numFreeEdges + i][numFreeEdges + i] = crease.getK();
    }
  }


  return {
    syncNodesAndEdges,
    solve,
    reset
  };
}

export default initStaticSolver;
