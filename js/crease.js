/**
 * Created by amandaghassaei on 2/25/17.
 */

function Crease(edge, face1Index, face2Index, targetTheta, node1, node2){

    //face1 corresponds to node1, face2 to node2
    this.edge = edge;
    this.face1Index = face1Index;
    this.face2Index = face2Index;
    this.targetTheta = targetTheta;
    this.node1 = node1;
    this.node2 = node2;
    node1.addCrease(this);
    node2.addCrease(this);
}

Crease.prototype.getLength = function(){
    return this.edge.getLength();
};

Crease.prototype.getVector = function(){
    return this.edge.getVector();
};

Crease.prototype.getNormal1Index = function(){
    return this.face1Index;
};

Crease.prototype.getNormal2Index = function(){
    return this.face2Index;
};

Crease.prototype.destroy = function(){
    this.node1.removeCrease(this);
    this.node2.removeCrease(this);
    this.edge = null;
    this.face1Index = null;
    this.face2Index = null;
    this.targetTheta = null;
    this.node1 = null;
    this.node2 = null;
};