/**
 * Created by ghassaei on 9/16/16.
 */

var nodeMaterial = new THREE.MeshBasicMaterial({color: 0x000000, side:THREE.DoubleSide});
var nodeMaterialFixed = new THREE.MeshBasicMaterial({color: 0x000000, side:THREE.DoubleSide});
var nodeMaterialHighlight = new THREE.MeshBasicMaterial({color: 0xffffff, side:THREE.DoubleSide});
var nodeGeo = new THREE.SphereGeometry(1,20);
nodeGeo.rotateX(Math.PI/2);
var nodeFixedGeo = new THREE.CubeGeometry(1, 1, 1);
nodeFixedGeo.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0.25, 0) );


function Node(position, index){

    this.type = "node";
    this.index = index;
    this._originalPosition = position.clone();

    this.object3D = new THREE.Mesh(nodeGeo, nodeMaterial);
    this.object3D._myNode = this;
    this.object3D.visible = false;

    this.beams = [];
    this.creases = [];
    this.invCreases = [];
    this.externalForce = null;
    this.fixed = false;

    this.render(new THREE.Vector3(0,0,0));
}

Node.prototype.setFixed = function(fixed){
    this.fixed = fixed;
    if (fixed) {
        this.object3D.material = nodeMaterialFixed;
        this.object3D.geometry = nodeFixedGeo;
        if (this.externalForce) this.externalForce.hide();
    }
    else {
        this.object3D.material = nodeMaterial;
        this.object3D.geometry = nodeGeo;
        if (this.externalForce) this.externalForce.show();
    }
};

Node.prototype.isFixed = function(){
    return this.fixed;
};

Node.prototype.moveManually = function(position){
    this.object3D.position.set(position.x, position.y, position.z);
    _.each(this.beams, function(beam){
        beam.render();
    });
};




//forces

Node.prototype.addExternalForce = function(force){
    // this.externalForce = force;
    // var position = this.getOriginalPosition();
    // this.externalForce.setOrigin(position);
    // if (this.fixed) this.externalForce.hide();
};

Node.prototype.getExternalForce = function(){
    if (!this.externalForce) return new THREE.Vector3(0,0,0);
    return this.externalForce.getForce();
};

Node.prototype.addCrease = function(crease){
    this.creases.push(crease);
};

Node.prototype.removeCrease = function(crease){
    if (this.creases === null) return;
    var index = this.creases.indexOf(crease);
    if (index>=0) this.creases.splice(index, 1);
};

Node.prototype.addInvCrease = function(crease){
    this.invCreases.push(crease);
};

Node.prototype.removeInvCrease = function(crease){
    if (this.invCreases === null) return;
    var index = this.invCreases.indexOf(crease);
    if (index>=0) this.invCreases.splice(index, 1);
};


Node.prototype.addBeam = function(beam){
    this.beams.push(beam);
};

Node.prototype.removeBeam = function(beam){
    if (this.beams === null) return;
    var index = this.beams.indexOf(beam);
    if (index>=0) this.beams.splice(index, 1);
};

Node.prototype.getBeams = function(){
    return this.beams;
};

Node.prototype.numBeams = function(){
    return this.beams.length;
};

Node.prototype.isConnectedTo = function(node){
    for (var i=0;i<this.beams.length;i++){
        if (this.beams[i].getOtherNode(this) == node) return true;
    }
    return false;
};

Node.prototype.numCreases = function(){
    return this.creases.length;
};

Node.prototype.getIndex = function(){//in nodes array
    return this.index;
};

Node.prototype.getObject3D = function(){
    return this.object3D;
};

Node.prototype.highlight = function(){
    this.object3D.material = nodeMaterialHighlight;
};

Node.prototype.unhighlight = function(){
    if (this.fixed) {
        this.object3D.material = nodeMaterialFixed;
    }
    else {
        this.object3D.material = nodeMaterial;
    }
};

Node.prototype.hide = function(){
    this.object3D.visible = false;
};

Node.prototype.render = function(position){
    // if (this.fixed) return;
    position.add(this.getOriginalPosition());
    // console.log(position);
    this.object3D.position.set(position.x, position.y, position.z);//todo need this?
    return position;
};

Node.prototype.renderChange = function(change){
    this.object3D.position.add(change);
};








//dynamic solve

Node.prototype.getOriginalPosition = function(){
    return this._originalPosition.clone();
};
Node.prototype.setOriginalPosition = function(x, y, z){
    this._originalPosition.set(x, y, z);
};

Node.prototype.getPosition = function(){
    return this.object3D.position;
};

Node.prototype.getRelativePosition = function(){
    return this.object3D.position.clone().sub(this._originalPosition);
};

Node.prototype.getSimMass = function(){
    return 1;
};





//deallocate

Node.prototype.destroy = function(){
    //object3D is removed in outer scope
    this.object3D._myNode = null;
    this.object3D = null;
    this.beams = null;
    this.creases = null;
    this.invCreases = null;
    this.externalForce = null;
};