/**
 * Created by amandaghassaei on 2/25/17.
 */

function Crease(globals, edge, face1Index, face2Index, targetTheta, type, node1, node2, index) {
  // type = 0 panel, 1 crease
  this.globals = globals;
  // face1 corresponds to node1, face2 to node2
  this.edge = edge;
  for (let i = 0; i < edge.nodes.length; i += 1) {
    edge.nodes[i].addInvCrease(this);
  }
  this.face1Index = face1Index; // todo this is useless
  this.face2Index = face2Index;
  this.targetTheta = targetTheta;
  this.type = type;
  this.node1 = node1; // node at vertex of face 1
  this.node2 = node2; // node at vertex of face 2
  this.index = index;
  node1.addCrease(this);
  node2.addCrease(this);
}

Crease.prototype.getLength = function () {
  return this.edge.getLength();
};

Crease.prototype.getVector = function (fromNode) {
  return this.edge.getVector(fromNode);
};

Crease.prototype.getNormal1Index = function () {
  return this.face1Index;
};

Crease.prototype.getNormal2Index = function () {
  return this.face2Index;
};

Crease.prototype.getTargetTheta = function () {
  return this.targetTheta;
};

Crease.prototype.getK = function () {
  const length = this.getLength();
  if (this.type === 0) return this.globals.panelStiffness * length;
  return this.globals.creaseStiffness * length;
};

Crease.prototype.getD = function () {
  return this.globals.percentDamping * 2 * Math.sqrt(this.getK());
};

Crease.prototype.getIndex = function () {
  return this.index;
};

Crease.prototype.getLengthToNode1 = function () {
  return this.getLengthTo(this.node1);
};

Crease.prototype.getLengthToNode2 = function () {
  return this.getLengthTo(this.node2);
};

Crease.prototype.getCoef1 = function (edgeNode) {
  return this.getCoef(this.node1, edgeNode);
};
Crease.prototype.getCoef2 = function (edgeNode) {
  return this.getCoef(this.node2, edgeNode);
};

Crease.prototype.getCoef = function (node, edgeNode) {
  const vector1 = this.getVector(edgeNode);
  const creaseLength = vector1.length();
  vector1.normalize();
  const nodePosition = node.getOriginalPosition();
  const vector2 = nodePosition.sub(edgeNode.getOriginalPosition());
  const projLength = vector1.dot(vector2);
  let length = Math.sqrt(vector2.lengthSq() - projLength * projLength);
  if (length <= 0.0) {
    console.warn("bad moment arm");
    length = 0.001;
  }
  return (1 - projLength / creaseLength);
};

Crease.prototype.getLengthTo = function (node) {
  const vector1 = this.getVector().normalize();
  const nodePosition = node.getOriginalPosition();
  const vector2 = nodePosition.sub(this.edge.nodes[1].getOriginalPosition());
  const projLength = vector1.dot(vector2);
  let length = Math.sqrt(vector2.lengthSq() - projLength * projLength);
  if (length <= 0.0) {
    console.warn("bad moment arm");
    length = 0.001;
  }
  return length;
};

Crease.prototype.getNodeIndex = function (node) {
  if (node === this.node1) return 1;
  if (node === this.node2) return 2;
  if (node === this.edge.nodes[0]) return 3;
  if (node === this.edge.nodes[1]) return 4;
  console.log("unknown node type");
  return 0;
};

Crease.prototype.setVisibility = function () {
  let vis = false;
  if (this.type === 0) vis = this.globals.panelsVisible;
  else {
    vis = (this.targetTheta > 0 && this.globals.mtnsVisible) || (this.targetTheta < 0 && this.globals.valleysVisible);
  }
  this.edge.setVisibility(vis);
};

Crease.prototype.destroy = function () {
  this.node1.removeCrease(this);
  this.node2.removeCrease(this);
  if (this.edge && this.edge.nodes) {
    for (let i = 0; i < this.edge.nodes.length; i += 1) {
      this.edge.nodes[i].removeInvCrease(this);
    }
  }
  this.edge = null;
  this.face1Index = null;
  this.face2Index = null;
  this.targetTheta = null;
  this.type = null;
  this.node1 = null;
  this.node2 = null;
  this.index = null;
};

export default Crease;
