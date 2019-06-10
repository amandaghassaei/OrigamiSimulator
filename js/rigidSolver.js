/**
 * Created by amandaghassaei on 5/26/17.
 */

// const numeric = require("numeric"); // this is not the correct npm name.
// search npm for the right package, or rewrite to match a new package

import { Vector3 } from "../import/three.module";

function initRigidSolver() {

  let nodes;
  let edges;
  let faces;
  let creases;
  let positions;

  let C;
  let F;

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

  // function pinv(A) { //for linearly ind rows
  //   let AT = numeric.transpose(A);
  //   return numeric.dot(AT, numeric.inv(numeric.dot(AT,A)));
  // }
  function pinv(A) {
    // http://www.numericjs.com/workshop.php?link=b923cdeb84e188a11b44e3e82e44897b3b7da1d6640ddb46ab7330a6625f8e19
    const z = numeric.svd(A);
    const foo = z.S[0];
    const U = z.U;
    const S = z.S;
    const V = z.V;
    const m = A.length;
    const n = A[0].length;
    const tol = Math.max(m, n) * numeric.epsilon * foo;
    const M = S.length;
    const Sinv = new Array(M);
    for (let i = M - 1; i !== -1; i -= 1) {
      if (S[i] > tol) Sinv[i] = 1 / S[i];
      else Sinv[i] = 0;
    }
    return numeric.dot(numeric.dot(V, numeric.diag(Sinv)), numeric.transpose(U));
  }

  function solveStep() {
    // todo add external forces
    const X = numeric.dot(
      numeric.sub(numeric.identity(3 * nodes.length),
      numeric.dot(numeric.transpose(pinv(numeric.transpose(C))), C)),
      F
    ); // todo valid psuedoinv?
    // let sum = new Vector3();
    // for (let i=0;i<_F.length;i+=3) {
    //     sum.x += _F[i];
    //     sum.y += _F[i+1];
    //     sum.z += _F[i+2];
    // }
    // console.log(sum);
    console.log(X);
    render(X);
  }

  function render(X) {

    for (let i = 0; i < nodes.length; i += 1) {
      const nodePosition = new Vector3(X[3 * i], X[3 * i + 1], X[3 * i + 2]);
      const nexPos = nodes[i].renderDelta(nodePosition);
      positions[3 * i] = nexPos.x;
      positions[3 * i + 1] = nexPos.y;
      positions[3 * i + 2] = nexPos.z;
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


  function setUpParams() {
    // C = (edges + creases) x 3nodes
    // disp = 1 x 3nodes
    C = initEmptyArray(edges.length, 3 * nodes.length); // todo change size
    F = initEmptyArray(3 * nodes.length);
    // for (let i=0;i<nodes.length;i++) {
    //     F[3*i] = 0;
    //     F[3*i+1] = 0;
    //     F[3*i+2] = 0;
    // }
  }

  function updateMatrices() {
    const numNodes = nodes.length;
    const numEdges = edges.length;
    F = initEmptyArray(3 * numNodes);
    for (let j = 0; j < numEdges; j += 1) {
      const edge = edges[j];
      const _nodes = edge.nodes;
      const edgeVector0 = edge.getVector(_nodes[0]);

      const length = edge.getOriginalLength();
      const diff = edgeVector0.length() - length;
      const rxnForceScale = globals.axialStiffness * diff / length;

      edgeVector0.normalize();
      let i = _nodes[0].getIndex();
      C[j][3 * i] = edgeVector0.x;
      C[j][3 * i + 1] = edgeVector0.y;
      C[j][3 * i + 2] = edgeVector0.z;
      F[3 * i] -= edgeVector0.x * rxnForceScale;
      F[3 * i + 1] -= edgeVector0.y * rxnForceScale;
      F[3 * i + 2] -= edgeVector0.z * rxnForceScale;

      i = _nodes[1].getIndex();
      C[j][3 * i] = -edgeVector0.x;
      C[j][3 * i + 1] = -edgeVector0.y;
      C[j][3 * i + 2] = -edgeVector0.z;
      F[3 * i] += edgeVector0.x * rxnForceScale;
      F[3 * i + 1] += edgeVector0.y * rxnForceScale;
      F[3 * i + 2] += edgeVector0.z * rxnForceScale;
    }

    const geometry = globals.model.getGeometry();
    const indices = geometry.index.array;
    const normals = [];

    // compute all normals
    const cb = new Vector3();
    const ab = new Vector3();
    for (let j = 0; j < indices.length; j += 3) {
      let index = 3 * indices[j];
      const vA = new Vector3(
        positions[index],
        positions[index + 1],
        positions[index + 2]
      );
      index = 3 * indices[j + 1];
      const vB = new Vector3(
        positions[index],
        positions[index + 1],
        positions[index + 2]
      );
      index = 3 * indices[j + 2];
      const vC = new Vector3(
        positions[index],
        positions[index + 1],
        positions[index + 2]
      );
      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab);

      cb.normalize();
      normals.push(cb.clone());
    }


    for (let j = 0; j < creases.length; j += 1) {
      const crease = creases[j];
      const normal1 = normals[crease.face1Index];
      const normal2 = normals[crease.face2Index];
      let dotNormals = normal1.dot(normal2);
      if (dotNormals < -1.0) dotNormals = -1.0;
      else if (dotNormals > 1.0) dotNormals = 1.0;

      const creaseVector = crease.getVector().normalize();
      // https://math.stackexchange.com/questions/47059/how-do-i-calculate-a-dihedral-angle-given-cartesian-coordinates
      const theta = Math.atan2((normal1.clone().cross(creaseVector)).dot(normal2), dotNormals);

      const diff = theta - globals.creasePercent * crease.targetTheta;
      const rxnForceScale = crease.getK() * diff;

      let partial1;
      let partial2;

      if (!crease.node1.fixed) {
        const i = crease.node1.getIndex();
        const dist = crease.getLengthToNode1();
        partial1 = normal1.clone().divideScalar(dist);
        // C[j+numFreeEdges][3*i] = partial1.x;
        // C[j+numFreeEdges][3*i+1] = partial1.y;
        // C[j+numFreeEdges][3*i+2] = partial1.z;
        F[3 * i] -= partial1.x * rxnForceScale;
        F[3 * i + 1] -= partial1.y * rxnForceScale;
        F[3 * i + 2] -= partial1.z * rxnForceScale;
      }
      if (!crease.node2.fixed) {
        const i = crease.node2.getIndex();
        const dist = crease.getLengthToNode2();
        partial2 = normal2.clone().divideScalar(dist);
        // C[j + numFreeEdges][3 * i] = partial2.x;
        // C[j + numFreeEdges][3 * i + 1] = partial2.y;
        // C[j + numFreeEdges][3 * i + 2] = partial2.z;
        F[3 * i] -= partial2.x * rxnForceScale;
        F[3 * i + 1] -= partial2.y * rxnForceScale;
        F[3 * i + 2] -= partial2.z * rxnForceScale;
      }
      const creaseNodes = crease.edge.nodes;
      for (let k = 0; k < creaseNodes.length; k += 1) {
        const node = creaseNodes[k];
        if (node.fixed) continue;
        const i = node.getIndex();

        // C[j + numFreeEdges][3 * i] = -(partial1.x + partial2.x) / 2;
        // C[j + numFreeEdges][3 * i + 1] = -(partial1.y + partial2.y) / 2;
        // C[j + numFreeEdges][3 * i + 2] = -(partial1.z + partial2.z) / 2;
        F[3 * i] += (partial1.x + partial2.x) / 2 * rxnForceScale;
        F[3 * i + 1] += (partial1.y + partial2.y) / 2 * rxnForceScale;
        F[3 * i + 2] += (partial1.z + partial2.z) / 2 * rxnForceScale;
      }
    }
  }

  return {
    syncNodesAndEdges,
    solve,
    reset
  };
}

export default initRigidSolver;
