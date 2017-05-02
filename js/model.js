/**
 * Created by amandaghassaei on 2/24/17.
 */

//wireframe model and folding structure
function initModel(globals){

    var material;
    setMeshMaterial();
    function setMeshMaterial(){
        if (globals.colorMode == "normal"){
            material = new THREE.MeshNormalMaterial({shading: THREE.FlatShading, side: THREE.DoubleSide});
        } else {
            material = THREE.MeshFaceMaterial([
                new THREE.MeshLambertMaterial({shading:THREE.FlatShading, color:0xff0000, side:THREE.FrontSide}),
                new THREE.MeshLambertMaterial({shading:THREE.FlatShading, color:0x0000ff, side:THREE.FrontSide})
            ]);
        }
        if (object3D) object3D.material = material;
    }

    var geometry = new THREE.Geometry();
    geometry.dynamic = true;
    var object3D = new THREE.Mesh(geometry, material);
    globals.threeView.sceneAdd(object3D);

    var allNodeObject3Ds = [];

    var nodes = [];
    // nodes.push(new Node(new THREE.Vector3(0,0,0), nodes.length));
    // nodes.push(new Node(new THREE.Vector3(0,0,10), nodes.length));
    // nodes.push(new Node(new THREE.Vector3(10,0,0), nodes.length));
    // nodes.push(new Node(new THREE.Vector3(0,0,-10), nodes.length));
    // nodes.push(new Node(new THREE.Vector3(10,0,-10), nodes.length));

    // nodes.push(new Node(new THREE.Vector3(-10,0,0), nodes.length));

    // nodes[0].setFixed(true);
    // nodes[1].setFixed(true);
    // nodes[2].setFixed(true);

    var edges = [];
    // edges.push(new Beam([nodes[1], nodes[0]]));
    // edges.push(new Beam([nodes[1], nodes[2]]));
    // edges.push(new Beam([nodes[2], nodes[0]]));
    // edges.push(new Beam([nodes[3], nodes[0]]));
    // edges.push(new Beam([nodes[3], nodes[2]]));
    // edges.push(new Beam([nodes[3], nodes[4]]));
    // edges.push(new Beam([nodes[2], nodes[4]]));

    // edges.push(new Beam([nodes[4], nodes[0]]));
    // edges.push(new Beam([nodes[4], nodes[1]]));
    // edges.push(new Beam([nodes[3], nodes[4]]));

    var faces = [];
    // faces.push(new THREE.Face3(0,1,2));
    // faces.push(new THREE.Face3(0,2,3));
    // faces.push(new THREE.Face3(4,3,2));

    // faces.push(new THREE.Face3(4,1,0));
    // faces.push(new THREE.Face3(3,4,0));

    var creases = [];
    // creases.push(new Crease(edges[2], 0, 1, Math.PI, 1, nodes[1], nodes[3], 0));
    // creases.push(new Crease(edges[4], 2, 1, -Math.PI, 1, nodes[4], nodes[0], 1));

    // creases.push(new Crease(edges[5], 3, 2, -Math.PI, 1, nodes[3], nodes[1], 1));
    // creases.push(new Crease(edges[0], 3, 0, Math.PI, 1, nodes[4], nodes[2], 2));


    // var _allNodeObject3Ds  = [];
    // _.each(nodes, function(node){
    //     var obj3D = node.getObject3D();
    //     _allNodeObject3Ds.push(obj3D);
    //     globals.threeView.sceneAddModel(obj3D);
    // });
    // allNodeObject3Ds = _allNodeObject3Ds;
    // _.each(edges, function(edge){
    //     globals.threeView.sceneAddModel(edge.getObject3D());
    // });

    function pause(){
        globals.threeView.pauseAnimation();
    }

    function resume(){
        startSolver();
    }

    var inited = false;
    startSolver();

    function startSolver(){
        globals.threeView.startAnimation(function(){
            if (!inited) return;
            if (globals.simType == "dynamic"){
                globals.dynamicModel.solve();
            } else {
                console.log("static");
            }
            geometry.verticesNeedUpdate = true;
            geometry.computeFaceNormals();
        });
    }

    function buildModel(_faces, _vertices, _allEdges, allCreaseParams){

        var _nodes = [];
        for (var i=0;i<_vertices.length;i++){
            _nodes.push(new Node(_vertices[i].clone(), _nodes.length));
        }
        _nodes[_faces[0].a].setFixed(true);
        // _nodes[_faces[0].b].setFixed(true);
        // _nodes[_faces[0].c].setFixed(true);

        var _edges = [];
        for (var i=0;i<_allEdges.length;i++) {
            _edges.push(new Beam([_nodes[_allEdges[i][0]], _nodes[_allEdges[i][1]]]));
        }

        var _creases = [];
        for (var i=0;i<allCreaseParams.length;i++) {//allCreaseParams.length
            var creaseParams = allCreaseParams[i];//face1Ind, vertInd, face2Ind, ver2Ind, edgeInd, angle
            _creases.push(new Crease(_edges[creaseParams[4]], creaseParams[0], creaseParams[2], creaseParams[5], creaseParams[5]!=0, _nodes[creaseParams[1]], _nodes[creaseParams[3]], _creases.length));
        }

        globals.threeView.sceneClearModel();
        var _allNodeObject3Ds  = [];
        _.each(_nodes, function(node){
            var obj3D = node.getObject3D();
            _allNodeObject3Ds.push(obj3D);
            globals.threeView.sceneAddModel(obj3D);
        });
        _.each(_edges, function(edge){
            globals.threeView.sceneAddModel(edge.getObject3D());
        });

        var oldNodes = nodes;
        var oldEdges = edges;
        var oldCreases = creases;

        nodes = _nodes;
        allNodeObject3Ds = _allNodeObject3Ds;
        edges = _edges;
        faces = _faces;
        creases = _creases;

        for (var i=0;i<oldNodes.length;i++){
            oldNodes[i].destroy();
        }
        oldNodes = null;

        for (var i=0;i<oldEdges.length;i++){
            oldEdges[i].destroy();
        }
        oldEdges = null;

        for (var i=0;i<oldCreases.length;i++){
            oldCreases[i].destroy();
        }
        oldCreases = null;

        var vertices = [];
        for (var i=0;i<nodes.length;i++){
            vertices.push(nodes[i].getPosition());
        }

        var geofaces = faces.slice();
        for (var i=0;i<faces.length;i++){
            geofaces[i].materialIndex = 1;
            geofaces.push(new THREE.Face3(faces[i].a, faces[i].c, faces[i].b));
        }

        geometry.vertices = vertices;
        geometry.faces = geofaces;
        geometry.verticesNeedUpdate = true;
        geometry.elementsNeedUpdate = true;
        geometry.computeFaceNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        globals.shouldSyncWithModel = true;
        inited = true;
        // globals.staticSolver.syncNodesAndEdges();
    }

    function getNodes(){
        return nodes;
    }

    function getEdges(){
        return edges;
    }

    function getFaces(){
        return faces;
    }

    function getCreases(){
        return creases;
    }

    function getObjectsToIntersect(){
        return allNodeObject3Ds;
    }

    return {
        pause: pause,
        resume: resume,
        getNodes: getNodes,
        getEdges: getEdges,
        getFaces: getFaces,
        getCreases: getCreases,
        buildModel: buildModel,
        getObjectsToIntersect: getObjectsToIntersect,
        setMeshMaterial: setMeshMaterial
    }
}