/**
 * Created by amandaghassaei on 3/27/17.
 */


function initStaticSolver(){

    var material = new THREE.MeshNormalMaterial({shading: THREE.FlatShading, side: THREE.DoubleSide});
    var geometry = new THREE.Geometry();
    geometry.dynamic = true;
    var object3D = new THREE.Mesh(geometry, material);
    globals.threeView.sceneAdd(object3D);


    var nodes;
    var edges;
    var faces;
    var creases;

    var Q, C, Ctrans, F;
    var Ctrans_Q, Ctrans_Q_C;
    var numFreeEdges, numVerticesFree, numVerticesFixed;
    var indicesMapping, fixedIndicesMapping, freeEdgesMapping;

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
        globals.threeView.render();

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
        if (fixedIndicesMapping.length == 0){//no boundary conditions
            var X = initEmptyArray(numVerticesFree*3);
            render(X);
            console.warn("no boundary conditions");
            return;
        }

        // console.log(JSON.stringify(Ctrans_Q_C));

        var _F = F.slice();
        var nullEntries = [];
        var infiniteEntry = false;
        var X = initEmptyArray(numVerticesFree*3);
        for (var i=Ctrans_Q_C.length;i>=0;i--){
            if (numeric.dot(Ctrans_Q_C[i], Ctrans_Q_C[i]) == 0) {
                if (_F[i] < 0) {
                    X[i] = -1;
                    nullEntries.push([i, -1]);
                    infiniteEntry = true;
                } else if (_F[i]>0) {
                    X[i] = 1;
                    nullEntries.push([i, 1]);
                    infiniteEntry = true;
                } else nullEntries.push([i, 0]);
                Ctrans_Q_C.splice(i, 1);
                _F.splice(i,1);
            }
        }

        if (infiniteEntry){
            render(X);
            return;
        }

        if (nullEntries.length>0){//remove zero columns
            for (var i=0;i<Ctrans_Q_C.length;i++){
                for (var j=0;j<nullEntries.length;j++){
                    Ctrans_Q_C[i].splice(nullEntries[j][0],1);
                }
            }
        }

        // console.log(Ctrans_Q_C);
        X = numeric.dot(numeric.inv(Ctrans_Q_C), _F);

        if (nullEntries.length>0){
            //add zeros back to X array
            console.log("here");
            for (var i=0;i<nullEntries.length;i++){
                X.splice(nullEntries[i][0], 0, 0);
            }
        }

        render(X);
    }

    function render(X){
        console.log(X);

        for (var i=0;i<numVerticesFree;i++){

            //normalize
            var sqLength = X[3*i]*X[3*i] + X[3*i+1]*X[3*i+1] + X[3*i+2]*X[3*i+2];
            if (sqLength>0){
                var length = Math.sqrt(sqLength);
                X[3*i] /= length;
                X[3*i+1] /= length;
                X[3*i+2] /= length;
            }

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
        calcCs();
        Ctrans = numeric.transpose(C);
        Ctrans_Q = numeric.dot(Ctrans, Q);
        Ctrans_Q_C = numeric.dot(Ctrans_Q, C);
        // console.log(JSON.stringify(Ctrans_Q_C));
    }

    function setUpParams(){

        indicesMapping = [];
        fixedIndicesMapping = [];
        freeEdgesMapping = [];

        for (var i=0;i<nodes.length;i++){
            if (nodes[i].fixed) fixedIndicesMapping.push(nodes[i].getIndex());
            else indicesMapping.push(nodes[i].getIndex());//todo push(i)
        }
        for (var i=0;i<edges.length;i++){
            if (edges[i].isFixed()) continue;
            freeEdgesMapping.push(i);
        }

        numVerticesFree = indicesMapping.length;
        numVerticesFixed = fixedIndicesMapping.length;
        numFreeEdges = freeEdgesMapping.length;

        //C = edges x 3nodes
        //Q = edges x edges
        //Ctrans = 3nodes x edges
        //disp = 1 x 3nodes

        Q = initEmptyArray(numFreeEdges, numFreeEdges);
        C = initEmptyArray(numFreeEdges, 3*numVerticesFree);
        calcQ();


        F = initEmptyArray(numVerticesFree*3);

        for (var i=0;i<numVerticesFree;i++){
            F[3*i] = 0;
            F[3*i+1] = 10;
            F[3*i+2] = 0;
        }

        updateMatrices();

        startSolver();
    }

    function calcCs(){
        for (var j=0;j<numFreeEdges;j++){
            var edge = edges[freeEdgesMapping[j]];
            var _nodes = edge.nodes;
            var edgeVector0 = edge.getVector(_nodes[0]);
            // edgeVector0.divideScalar(edge.getOriginalLength());
            edgeVector0.normalize();
            if (!_nodes[0].fixed) {
                var i = indicesMapping.indexOf(_nodes[0].getIndex());
                C[j][3*i] = edgeVector0.x;
                C[j][3*i+1] = edgeVector0.y;
                C[j][3*i+2] = edgeVector0.z;
            }
            if (!_nodes[1].fixed) {
                var i = indicesMapping.indexOf(_nodes[1].getIndex());
                C[j][3*i] = -edgeVector0.x;
                C[j][3*i+1] = -edgeVector0.y;
                C[j][3*i+2] = -edgeVector0.z;
            }
        }
        // console.log(C);
    }

    function calcQ() {
        var axialStiffness = globals.axialStiffness;
        for (var i = 0; i < numFreeEdges; i++) {
            Q[i][i] = axialStiffness;
        }
    }


    return {
        syncNodesAndEdges: syncNodesAndEdges
    }
}