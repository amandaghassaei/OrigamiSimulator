/**
 * Created by amandaghassaei on 2/24/17.
 */

//model updates object3d geometry and materials

function initModel(globals){

    var geometry = new THREE.BufferGeometry();
    geometry.dynamic = true;

    var material, material2;
    var frontside = new THREE.Mesh(geometry);//front face of mesh
    var backside = new THREE.Mesh(geometry);//back face of mesh (different color)
    backside.visible = false;
    setMeshMaterial();

    var positions;//place to store buffer geo vertex data
    var colors;//place to store buffer geo vertex colors
    var indices;
    var nodes = [];
    var faces = [];
    var edges = [];
    var creases = [];
    var vertices = [];//indexed vertices array

    var nextNodes, nextEdges, nextCreases, nextFaces;

    var inited = false;

    function setMeshMaterial() {
        var polygonOffset = 0.5;
        if (globals.colorMode == "normal") {
            material = new THREE.MeshNormalMaterial({
                shading:THREE.FlatShading, side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
        } else if (globals.colorMode == "axialStrain"){
            material = new THREE.MeshBasicMaterial({
                vertexColors: THREE.VertexColors, side:THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
            if (!globals.threeView.simulationRunning) {
                getSolver().render();
                setGeoUpdates();
            }
        } else {
            material = new THREE.MeshPhongMaterial({
                shading:THREE.FlatShading, side:THREE.FrontSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            material2 = new THREE.MeshPhongMaterial({
                shading:THREE.FlatShading, side:THREE.BackSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            material.color.setStyle( "#" + globals.color1);
            material2.color.setStyle( "#" + globals.color2);
            backside.visible = true;
        }
        frontside.material = material;
        backside.material = material2;
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
        frontside.visible = globals.meshVisible;
        backside.visible = globals.colorMode == "color" && globals.meshVisible;
    }

    function getGeometry(){
        return geometry;
    }

    function getMesh(){
        return [frontside, backside];
    }
    function getVertices(){
        return vertices;
    }

    function getPositionsArray(){
        return positions;
    }
    function getColorsArray(){
        return colors;
    }

    function pause(){
        globals.threeView.pauseSimulation();
    }

    function resume(){
        globals.threeView.startSimulation();
    }

    function reset(){
        getSolver().reset();
        setGeoUpdates();
    }

    function step(numSteps){
        getSolver().solve(numSteps);
        setGeoUpdates();
    }

    function setGeoUpdates(){
        geometry.attributes.position.needsUpdate = true;
        if (globals.colorMode == "axialStrain") geometry.attributes.color.needsUpdate = true;
        // if (globals.userInteractionEnabled || globals.vrEnabled) geometry.computeBoundingBox();
    }

    function startSolver(){
        globals.threeView.startAnimation(step);
    }

    function getSolver(){
        if (globals.simType == "dynamic") return globals.dynamicSolver;
        else if (globals.simType == "static") return globals.staticSolver;
        return globals.rigidSolver;
    }





    function buildModel(_faces, _vertices, _allEdges, allCreaseParams){

        if (_vertices.length == 0) {
            console.warn("no vertices");
            return;
        }
        if (_faces.length == 0) {
            console.warn("no faces");
            return;
        }
        if (_allEdges.length == 0) {
            console.warn("no edges");
            return;
        }

        nextNodes = [];
        for (var i=0;i<_vertices.length;i++){
            nextNodes.push(new Node(_vertices[i].clone(), nextNodes.length));
        }
        // _nodes[_faces[0][0]].setFixed(true);
        // _nodes[_faces[0][1]].setFixed(true);
        // _nodes[_faces[0][2]].setFixed(true);

        nextEdges = [];
        for (var i=0;i<_allEdges.length;i++) {
            nextEdges.push(new Beam([nextNodes[_allEdges[i][0]], nextNodes[_allEdges[i][1]]]));
        }

        nextCreases = [];
        for (var i=0;i<allCreaseParams.length;i++) {//allCreaseParams.length
            var creaseParams = allCreaseParams[i];//face1Ind, vert1Ind, face2Ind, ver2Ind, edgeInd, angle
            var type = creaseParams[5]!=0 ? 1:0;
            //edge, face1Index, face2Index, targetTheta, type, node1, node2, index
            nextCreases.push(new Crease(nextEdges[creaseParams[4]], creaseParams[0], creaseParams[2], creaseParams[5], type, nextNodes[creaseParams[1]], nextNodes[creaseParams[3]], nextCreases.length));
        }

        nextFaces = _faces;

        globals.needsSync = true;
        globals.simNeedsSync = true;

        if (!inited) {
            startSolver();//start animation loop
            inited = true;
        }
    }



    function sync(){

        globals.threeView.sceneClearModel();

        // _.each(_nodes, function(node){
        //     var obj3D = node.getObject3D();
        //     globals.threeView.sceneAddModel(obj3D);
        // });
        _.each(nextEdges, function(edge){
            globals.threeView.sceneAddModel(edge.getObject3D());
        });

        for (var i=0;i<nodes.length;i++){
            nodes[i].destroy();
        }

        for (var i=0;i<edges.length;i++){
            edges[i].destroy();
        }

        for (var i=0;i<creases.length;i++){
            creases[i].destroy();
        }

        nodes = nextNodes;
        edges = nextEdges;
        faces = nextFaces;
        creases = nextCreases;

        vertices = [];
        for (var i=0;i<nodes.length;i++){
            vertices.push(nodes[i].getPosition());
        }

        if (globals.noCreasePatternAvailable() && globals.navMode == "pattern"){
            //switch to simulation mode
            $("#navSimulation").parent().addClass("open");
            $("#navPattern").parent().removeClass("open");
            $("#svgViewer").hide();
            globals.navMode = "simulation";
        }

        positions = new Float32Array(vertices.length*3);
        colors = new Float32Array(vertices.length*3);
        indices = new Uint16Array(faces.length*3);

        for (var i=0;i<vertices.length;i++){
            positions[3*i] = vertices[i].x;
            positions[3*i+1] = vertices[i].y;
            positions[3*i+2] = vertices[i].z;
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

        var scale = 1/geometry.boundingSphere.radius;
        globals.scale = scale;

        backside.geometry = geometry;
        frontside.geometry.dispose();
        frontside.geometry = geometry;

        //scale geometry
        for (var i=0;i<positions.length;i++){
            positions[i] *= scale;
        }
        for (var i=0;i<vertices.length;i++){
            vertices[i].multiplyScalar(scale);
        }

        //update vertices and edges
        for (var i=0;i<vertices.length;i++){
            nodes[i].setOriginalPosition(positions[3*i], positions[3*i+1], positions[3*i+2]);
        }
        for (var i=0;i<edges.length;i++){
            edges[i].recalcOriginalLength();
        }

        globals.threeView.sceneAddModel(frontside);
        globals.threeView.sceneAddModel(backside);

        updateEdgeVisibility();
        updateMeshVisibility();

        syncSolver();

        globals.needsSync = false;
        if (!globals.simulationRunning) reset();
    }

    function syncSolver(){
        getSolver().syncNodesAndEdges();
        globals.simNeedsSync = false;
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

    function getDimensions(){
        geometry.computeBoundingBox();
        return geometry.boundingBox.max.clone().sub(geometry.boundingBox.min);
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
        getGeometry: getGeometry,//for save stl
        getVertices: getVertices,//for user interaction, vive interface
        getPositionsArray: getPositionsArray,
        getColorsArray: getColorsArray,
        getMesh: getMesh,

        buildModel: buildModel,//load new model
        sync: sync,//update geometry to new model
        syncSolver: syncSolver,//update solver params

        //rendering
        setMeshMaterial: setMeshMaterial,
        updateEdgeVisibility: updateEdgeVisibility,
        updateMeshVisibility: updateMeshVisibility,

        getDimensions: getDimensions//for save stl
    }
}