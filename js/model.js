/**
 * Created by amandaghassaei on 2/24/17.
 */

//wireframe model and folding structure
function initModel(globals){

    var geometry = new THREE.BufferGeometry();
    geometry.dynamic = true;

    var material, material2;
    var object3D = new THREE.Mesh(geometry);
    var object3D2 = new THREE.Mesh(geometry);
    object3D2.visible = false;
    setMeshMaterial();

    var positions;//place to store buffer geo vertex data
    var colors;//place to store buffer geo vertex colors
    var indices;
    var nodes = [];
    var faces = [];
    var edges = [];
    var creases = [];

    function setMeshMaterial() {
        if (globals.colorMode == "normal") {
            material = new THREE.MeshNormalMaterial({shading:THREE.FlatShading, side: THREE.DoubleSide});
            object3D2.visible = false;
        } else if (globals.colorMode == "axialStrain"){
            material = new THREE.MeshBasicMaterial({vertexColors: THREE.VertexColors, side:THREE.DoubleSide});
            object3D2.visible = false;
        } else {
            material = new THREE.MeshPhongMaterial({shading:THREE.FlatShading, color:0xff0000, side:THREE.FrontSide});
            material2 = new THREE.MeshPhongMaterial({shading:THREE.FlatShading, color:0x0000ff, side:THREE.BackSide});
            material.color.setStyle( "#" + globals.color1);
            material2.color.setStyle( "#" + globals.color2);
            object3D2.visible = true;
        }
        object3D.material = material;
        object3D2.material = material2;
    }

    function updateEdgeVisibility(){
        for (var i=0;i<edges.length;i++){
            edges[i].setVisibility(false);
        }
        if (!globals.edgesVisible) return;
        for (var i=0;i<edges.length;i++){
            edges[i].setVisibility(globals.passiveEdgesVisible);
        }
        for (var i=0;i<creases.length;i++){
            creases[i].setVisibility();
        }
    }

    function updateMeshVisibility(){
        object3D.visible = globals.meshVisible;
        object3D2.visible = globals.colorMode == "color" && globals.meshVisible;
    }

    function getGeometry(){
        return geometry;
    }

    function getPositionsArray(){
        return positions;
    }
    function getColorsArray(){
        return colors;
    }

    // nodes.push(new Node(new THREE.Vector3(0,0,0), nodes.length));
    // nodes.push(new Node(new THREE.Vector3(0,0,10), nodes.length));
    // nodes.push(new Node(new THREE.Vector3(10,0,0), nodes.length));
    // nodes.push(new Node(new THREE.Vector3(0,0,-10), nodes.length));
    // nodes.push(new Node(new THREE.Vector3(10,0,-10), nodes.length));

    // nodes.push(new Node(new THREE.Vector3(-10,0,0), nodes.length));

    // nodes[0].setFixed(true);
    // nodes[1].setFixed(true);
    // nodes[2].setFixed(true);

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

    // faces.push(new THREE.Face3(0,1,2));
    // faces.push(new THREE.Face3(0,2,3));
    // faces.push(new THREE.Face3(4,3,2));

    // faces.push(new THREE.Face3(4,1,0));
    // faces.push(new THREE.Face3(3,4,0));

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

    function reset(){
        if (globals.simType == "dynamic"){
            globals.dynamicSolver.reset();
        } else {
            globals.staticSolver.reset();
        }
        setGeoUpdates();
        globals.threeView.render();
    }

    function step(numSteps){
        if (globals.simType == "dynamic"){
            globals.dynamicSolver.solve(numSteps);
        } else {
            globals.staticSolver.step(numSteps);
        }
        setGeoUpdates();
        globals.threeView.render();
    }

    function setGeoUpdates(){
        geometry.attributes.position.needsUpdate = true;
        if (globals.colorMode == "axialStrain") geometry.attributes.color.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    var inited = false;
    startSolver();

    function startSolver(){
        globals.threeView.startAnimation(function(){
            if (!inited) return;
            if (globals.simType == "dynamic"){
                globals.dynamicSolver.solve();
            } else {
                console.log("static");
            }
            geometry.attributes.position.needsUpdate = true;
            setGeoUpdates();
        });
    }

    function buildModel(_faces, _vertices, _allEdges, allCreaseParams){
        if (_vertices.length == 0 || _faces.length == 0 || _allEdges.length == 0) {
            console.warn("bad geometry");
            return;
        }

        var _nodes = [];
        for (var i=0;i<_vertices.length;i++){
            _nodes.push(new Node(_vertices[i].clone(), _nodes.length));
        }
        // _nodes[_faces[0].a].setFixed(true);
        // _nodes[_faces[0].b].setFixed(true);
        // _nodes[_faces[0].c].setFixed(true);

        var _edges = [];
        for (var i=0;i<_allEdges.length;i++) {
            _edges.push(new Beam([_nodes[_allEdges[i][0]], _nodes[_allEdges[i][1]]]));
        }

        var _creases = [];
        for (var i=0;i<allCreaseParams.length;i++) {//allCreaseParams.length
            var creaseParams = allCreaseParams[i];//face1Ind, vertInd, face2Ind, ver2Ind, edgeInd, angle
            var type = creaseParams[5]!=0 ? 1:0;
            _creases.push(new Crease(_edges[creaseParams[4]], creaseParams[0], creaseParams[2], creaseParams[5], type, _nodes[creaseParams[1]], _nodes[creaseParams[3]], _creases.length));
        }

        globals.threeView.sceneClearModel();

        // _.each(_nodes, function(node){
        //     var obj3D = node.getObject3D();
        //     globals.threeView.sceneAddModel(obj3D);
        // });
        _.each(_edges, function(edge){
            globals.threeView.sceneAddModel(edge.getObject3D());
        });

        var oldNodes = nodes;
        var oldEdges = edges;
        var oldCreases = creases;

        nodes = _nodes;
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

        globals.threeView.sceneAddModel(object3D);
        globals.threeView.sceneAddModel(object3D2);

        globals.shouldSyncWithModel = true;
        inited = true;
        updateEdgeVisibility();
        updateMeshVisibility();

        if (globals.noCreasePatternAvailable() && globals.navMode == "pattern"){
            //switch to simulation mode
            $("#navSimulation").parent().addClass("open");
            $("#navPattern").parent().removeClass("open");
            $("#svgViewer").hide();
            globals.navMode = "simulation";
        }
    }

    function sync(){
        var vertices = [];
        for (var i=0;i<nodes.length;i++){
            vertices.push(nodes[i].getPosition());
        }

        positions = new Float32Array(vertices.length*3);
        colors = new Float32Array(vertices.length*3);
        indices = new Uint16Array(faces.length*3);

        for (var i=0;i<vertices.length;i++){
            positions[3*i] = vertices[i].x;
            positions[3*i+1] = vertices[i].y;
            positions[3*i+2] = vertices[i].z;
            colors[3*i] = 1;
            colors[3*i+1] = 0;
            colors[3*i+2] = 1;
        }
        for (var i=0;i<faces.length;i++){
            var face = faces[i];
            indices[3*i] = face[0];
            indices[3*i+1] = face[1];
            indices[3*i+2] = face[2];
        }

        geometry = new THREE.BufferGeometry();
        geometry.dynamic = true;

        geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));

        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.center();

        object3D.geometry.dispose();
        object3D.geometry = geometry;
        object3D2.geometry = geometry;

        //update vertices
        for (var i=0;i<vertices.length;i++){
            nodes[i].setOriginalPosition(positions[3*i], positions[3*i+1], positions[3*i+2]);
        }
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

    return {
        pause: pause,
        resume: resume,
        reset: reset,
        step: step,
        getNodes: getNodes,
        getEdges: getEdges,
        getFaces: getFaces,
        getCreases: getCreases,
        buildModel: buildModel,
        setMeshMaterial: setMeshMaterial,
        updateEdgeVisibility: updateEdgeVisibility,
        updateMeshVisibility: updateMeshVisibility,
        getGeometry: getGeometry,//for save stl
        getPositionsArray: getPositionsArray,
        getColorsArray: getColorsArray,
        sync: sync
    }
}