/**
 * Created by amandaghassaei on 2/25/17.
 */

function Crease(edge, face1Index, face2Index, targetTheta, type, node1, node2){//type = 0 panel, 1 crease

    //face1 corresponds to node1, face2 to node2
    this.edge = edge;
    this.face1Index = face1Index;
    this.face2Index = face2Index;
    this.targetTheta = targetTheta;
    this.type = type;
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

Crease.prototype.getTargetTheta = function(){
    return this.targetTheta;
};

Crease.prototype.getK = function(){
    var length = this.getLength();
    if (this.type == 0) return globals.panelStiffness*length;
    return globals.creaseStiffness*length;
};

Crease.prototype.getD = function(){
    return globals.percentDamping*2*Math.sqrt(this.getK());
};

Crease.prototype.destroy = function(){
    this.node1.removeCrease(this);
    this.node2.removeCrease(this);
    this.edge = null;
    this.face1Index = null;
    this.face2Index = null;
    this.targetTheta = null;
    this.type = null;
    this.node1 = null;
    this.node2 = null;
};