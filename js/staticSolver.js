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

    var Q, C, Ctrans, Cfixed, CfixedTrans, Xfixed, F;
    var Ctrans_Q, Ctrans_Q_C, inv_Ctrans_Q_C, Ctrans_Q_Cf, Ctrans_Q_Cf_Xf;
    var numEdges, numVerticesFree, numVerticesFixed;
    var indicesMapping, fixedIndicesMapping;

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

    function setUpParams(){

        indicesMapping = [];
        fixedIndicesMapping = [];

        for (var i=0;i<nodes.length;i++){
            if (nodes[i].fixed) fixedIndicesMapping.push(nodes[i].getIndex());
            else indicesMapping.push(nodes[i].getIndex());
        }

        numVerticesFree = indicesMapping.length;
        numVerticesFixed = fixedIndicesMapping.length;
        numEdges = edges.length;

        //C = edges x 3nodes
        //Q = edges x edges
        //Ctrans = 3nodes x edges
        //disp = 1x3nodes

        Q = initEmptyArray(numEdges, numEdges);
        C = initEmptyArray(numEdges, 3*numVerticesFree);
        Cfixed = initEmptyArray(numEdges, 3*numVerticesFixed);
        calcQ();
        calcCs();

        Ctrans = numeric.transpose(C);
        CfixedTrans = numeric.transpose(Cfixed);

        F = initEmptyArray(3*indicesMapping);
        Xfixed = initEmptyArray(3*numVerticesFixed);

        for (var i=0;i<indicesMapping.length;i++){
            F[i] = 0;
            F[i+1] = 1;//gravity
            F[i+2] = 0;
        }
        for (var i=0;i<numVerticesFixed;i++){
            var position = nodes[fixedIndicesMapping[i]].getOriginalPosition();
            Xfixed[i] = position.x;
            Xfixed[i+1] = position.y;
            Xfixed[i+2] = position.z;
        }

        Ctrans_Q = numeric.dot(Ctrans, Q);
        Ctrans_Q_C = numeric.dot(Ctrans_Q, C);
        console.log(JSON.stringify(Ctrans_Q_C));
        if (numeric.det(Ctrans_Q_C) == 0){
            console.warn("zero determinant");
            return;
        }
        inv_Ctrans_Q_C = numeric.inv(Ctrans_Q_C);
        Ctrans_Q_Cf = numeric.dot(Ctrans_Q, Cfixed);
        Ctrans_Q_Cf_Xf = numeric.dot(Ctrans_Q_Cf, Xfixed);

    }

    function calcCs(){
        for (var j=0;j<numEdges;j++){
            var edge = edges[j];
            var _nodes = edge.nodes;
            var edgeVector0 = edge.getVector(_nodes[0]);
            var edgeVector1 = edge.getVector(_nodes[1]);
            if (_nodes[0].fixed) {
                var i = fixedIndicesMapping.indexOf(_nodes[0].getIndex());
                Cfixed[j][i*3] = edgeVector0.x;
                Cfixed[j][i*3+1] = edgeVector0.y;
                Cfixed[j][i*3+2] = edgeVector0.z;
            } else {
                var i = indicesMapping.indexOf(_nodes[0].getIndex());
                C[j][3*i] = edgeVector0.x;
                C[j][3*i+1] = edgeVector0.y;
                C[j][3*i+2] = edgeVector0.z;
            }
            if (_nodes[1].fixed) {
                var i = fixedIndicesMapping.indexOf(_nodes[1].getIndex());
                Cfixed[j][i*3] = edgeVector1.x;
                Cfixed[j][i*3+1] = edgeVector1.y;
                Cfixed[j][i*3+2] = edgeVector1.z;
            } else {
                var i = indicesMapping.indexOf(_nodes[1].getIndex());
                C[j][3*i] = edgeVector1.x;
                C[j][3*i+1] = edgeVector1.y;
                C[j][3*i+2] = edgeVector1.z;
            }
        }
    }

    function calcQ(){
        var axialStiffness = globals.axialStiffness;
        for (var i=0;i<numEdges;i++){
            Q[i][i] = axialStiffness;
        }
    }

    function solve(){

    }



    return {
        syncNodesAndEdges: syncNodesAndEdges
    }
}