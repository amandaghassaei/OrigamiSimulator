/**
 * Created by amandaghassaei on 3/27/17.
 */


function initStaticSolver(){

    var material = new THREE.MeshNormalMaterial({shading: THREE.FlatShading, side: THREE.FrontSide});
    var geometry = new THREE.Geometry();
    geometry.dynamic = true;
    var object3D = new THREE.Mesh(geometry, material);
    // globals.threeView.sceneAdd(object3D);


    var nodes;
    var edges;
    var faces;
    var creases;

    var Q, C, Ctrans, F, F_rxn;
    var Ctrans_Q, Ctrans_Q_C;
    var numFreeEdges, numVerticesFree, numVerticesFixed, numFreeCreases;
    var indicesMapping, fixedIndicesMapping, freeEdgesMapping, freeCreasesMapping;

    function syncNodesAndEdges(){
        nodes = globals.model.getNodes();
        edges = globals.model.getEdges();
        faces = globals.model.getFaces();
        creases = globals.model.getCreases();

        var vertices = [];
        for (var i=0;i<nodes.length;i++){
            vertices.push(nodes[i].getPosition());
        }

        geometry.vertices = vertices;
        geometry.faces = faces;
        geometry.verticesNeedUpdate = true;
        geometry.elementsNeedUpdate = true;
        geometry.computeFaceNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        var bounds = geometry.boundingBox;
        var avg = (bounds.min.add(bounds.max)).multiplyScalar(-0.5);
        // object3D.position.set(avg.x, 0, avg.z);
        // globals.threeView.centerModel(avg);

        setUpParams();
    }

    function startSolver(){
        globals.threeView.startAnimation(function(){
            for (var j=0;j<1;j++){
                solveStep();
            }
        });
    }

    function solveStep(){
        console.log("static solve");
        if (fixedIndicesMapping.length == 0){//no boundary conditions
            var X = initEmptyArray(numVerticesFree*3);
            render(X);
            console.warn("no boundary conditions");
            return;
        }

        var _F = F.slice();
        for (var i=0;i<_F.length;i++) {
            _F[i] += F_rxn[i];
        }

        X = numeric.dot(numeric.inv(Ctrans_Q_C), _F);

        render(X);
    }

    function render(X){

        for (var i=0;i<numVerticesFree;i++){

            var nodePosition = new THREE.Vector3(X[3*i],X[3*i+1],X[3*i+2]);
            var node = nodes[indicesMapping[i]];
            node.renderChange(nodePosition);
        }
        for (var i=0;i<numVerticesFixed;i++){
            nodes[fixedIndicesMapping[i]].render(new THREE.Vector3(0,0,0));
        }
        for (var i=0;i<edges.length;i++){
            edges[i].render(true);
        }

        geometry.verticesNeedUpdate = true;
        geometry.computeFaceNormals();
        updateMatrices();
    }

    function initEmptyArray(dim1, dim2, dim3){
        if (dim2 === undefined) dim2 = 0;
        if (dim3 === undefined) dim3 = 0;
        var array = [];
        for (var i=0;i<dim1;i++){
            if (dim2 == 0) array.push(0);
            else array.push([]);
            for (var j=0;j<dim2;j++){
                if (dim3 == 0) array[i].push(0);
                else array[i].push([]);
                for (var k=0;k<dim3;k++){
                    array[i][j].push(0);
                }
            }
        }
        return array;
    }

    function updateMatrices(){
        calcCsAndRxns();
        Ctrans = numeric.transpose(C);
        Ctrans_Q = numeric.dot(Ctrans, Q);
        Ctrans_Q_C = numeric.dot(Ctrans_Q, C);
    }

    function setUpParams(){

        indicesMapping = [];
        fixedIndicesMapping = [];
        freeEdgesMapping = [];
        freeCreasesMapping = [];

        for (var i=0;i<nodes.length;i++){
            if (nodes[i].fixed) fixedIndicesMapping.push(nodes[i].getIndex());//todo need this?
            else indicesMapping.push(nodes[i].getIndex());//todo push(i)
        }
        for (var i=0;i<edges.length;i++){
            if (edges[i].isFixed()) continue;
            freeEdgesMapping.push(i);
        }
        for (var i=0;i<creases.length;i++){
            freeCreasesMapping.push(i);//todo check for locked creases
        }

        numVerticesFree = indicesMapping.length;
        numVerticesFixed = fixedIndicesMapping.length;
        numFreeEdges = freeEdgesMapping.length;
        numFreeCreases = freeCreasesMapping.length;


        //C = (edges + creases) x 3nodes
        //Q = (edges + creases) x (edges + creases)
        //Ctrans = 3nodes x (edges + creases)
        //disp = 1 x 3nodes

        Q = initEmptyArray(numFreeEdges+numFreeCreases, numFreeEdges+numFreeCreases);
        C = initEmptyArray(numFreeEdges+numFreeCreases, 3*numVerticesFree);
        calcQ();

        F = initEmptyArray(numVerticesFree*3);

        for (var i=0;i<numVerticesFree;i++){
            F[3*i] = 0;
            F[3*i+1] = 0;
            F[3*i+2] = 0;
        }

        updateMatrices();

        startSolver();
    }

    function calcCsAndRxns(){
        F_rxn = initEmptyArray(numVerticesFree*3);
        for (var j=0;j<numFreeEdges;j++){
            var edge = edges[freeEdgesMapping[j]];
            var _nodes = edge.nodes;
            var edgeVector0 = edge.getVector(_nodes[0]);

            var length = edge.getOriginalLength();
            var diff = edgeVector0.length() - length;
            var rxnForceScale = globals.axialStiffness*diff/length;

            edgeVector0.normalize();
            if (!_nodes[0].fixed) {
                var i = indicesMapping.indexOf(_nodes[0].getIndex());
                C[j][3*i] = edgeVector0.x;
                C[j][3*i+1] = edgeVector0.y;
                C[j][3*i+2] = edgeVector0.z;
                F_rxn[3*i] += edgeVector0.x*rxnForceScale;
                F_rxn[3*i+1] += edgeVector0.y*rxnForceScale;
                F_rxn[3*i+2] += edgeVector0.z*rxnForceScale;
            }
            if (!_nodes[1].fixed) {
                var i = indicesMapping.indexOf(_nodes[1].getIndex());
                C[j][3*i] = -edgeVector0.x;
                C[j][3*i+1] = -edgeVector0.y;
                C[j][3*i+2] = -edgeVector0.z;
                F_rxn[3*i] -= edgeVector0.x*rxnForceScale;
                F_rxn[3*i+1] -= edgeVector0.y*rxnForceScale;
                F_rxn[3*i+2] -= edgeVector0.z*rxnForceScale;
            }
        }

        for (var j=0;j<numFreeCreases;j++){
            var crease = creases[freeCreasesMapping[j]];

            var normal1 = geometry.faces[crease.face1Index].normal;
            var normal2 = geometry.faces[crease.face2Index].normal;
            var dotNormals = normal1.dot(normal2);
            if (dotNormals < -1.0) dotNormals = -1.0;
            else if (dotNormals > 1.0) dotNormals = 1.0;
            var theta = Math.acos(dotNormals);

            var creaseVector = crease.getVector();
            var sign = (normal1.clone().cross(normal2)).dot(creaseVector);
            if (sign < 0.0) theta *= -1.0;
            // if (theta > 2.0 && lastTheta[0] < -2.0) theta -= TWO_PI*(1.0+floor(-lastTheta[0]/TWO_PI));
            // if (theta < -2.0 && lastTheta[0] > 2.0) theta += TWO_PI*(1.0+floor(lastTheta[0]/TWO_PI));

            var diff = theta - globals.creasePercent*crease.targetTheta;

            if (!crease.node1.fixed){
                var i = indicesMapping.indexOf(crease.node1.getIndex());
                var dist = crease.getLengthToNode1();
                C[j+numFreeEdges][3*i] = -normal1.x/dist;
                C[j+numFreeEdges][3*i+1] = -normal1.y/dist;
                C[j+numFreeEdges][3*i+2] = -normal1.z/dist;
                rxnForceScale = crease.getK()*diff/dist;
                F_rxn[3*i] += normal1.x*rxnForceScale;
                F_rxn[3*i+1] += normal1.y*rxnForceScale;
                F_rxn[3*i+2] += normal1.z*rxnForceScale;
            }
            if (!crease.node2.fixed){
                var i = indicesMapping.indexOf(crease.node2.getIndex());
                var dist = crease.getLengthToNode2();
                C[j+numFreeEdges][3*i] = -normal2.x/dist;
                C[j+numFreeEdges][3*i+1] = -normal2.y/dist;
                C[j+numFreeEdges][3*i+2] = -normal2.z/dist;
                rxnForceScale = crease.getK()*diff/dist;
                F_rxn[3*i] += normal2.x*rxnForceScale;
                F_rxn[3*i+1] += normal2.y*rxnForceScale;
                F_rxn[3*i+2] += normal2.z*rxnForceScale;
            }
        }
    }

    function calcQ() {
        var axialStiffness = globals.axialStiffness;
        for (var i = 0; i < numFreeEdges; i++) {
            Q[i][i] = axialStiffness/edges[freeEdgesMapping[i]].getOriginalLength();
        }
        for (var i = 0; i < numFreeCreases; i++) {
            var crease = creases[freeCreasesMapping[i]];
            Q[numFreeEdges+i][numFreeEdges+i] = crease.getK();
        }
    }


    return {
        syncNodesAndEdges: syncNodesAndEdges
    }
}