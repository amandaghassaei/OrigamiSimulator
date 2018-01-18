/**
 * Created by amandaghassaei on 2/24/17.
 */

//model updates object3d geometry and materials

function initModel(params){//3DViewer()

    var material, material2, geometry;
    var frontside = new THREE.Mesh();//front face of mesh
    var backside = new THREE.Mesh();//back face of mesh (different color)
    backside.visible = false;
    var frontColor, backColor;//colors used for mesh, hex strings

    var lineMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1});
    //each edge type is a separate LineSegments object - so visibility can be easily toggled
    var hingeLines = new THREE.LineSegments(null, lineMaterial);
    var mountainLines = new THREE.LineSegments(null, lineMaterial);
    var valleyLines = new THREE.LineSegments(null, lineMaterial);
    var cutLines = new THREE.LineSegments(null, lineMaterial);
    var facetLines = new THREE.LineSegments(null, lineMaterial);
    var borderLines = new THREE.LineSegments(null, lineMaterial);

    var lines = {
        U: hingeLines,
        M: mountainLines,
        V: valleyLines,
        C: cutLines,
        F: facetLines,
        B: borderLines
    };

    var positions;//place to store buffer geo vertex data
    var colors;//place to store buffer geo vertex colors

    var nodes = [];
    var faces = [];
    var edges = [];
    var creases = [];
    var fold, creaseParams;

    var modelNeedsSync = false;
    var nextFold, nextCreaseParams;//todo only nextFold, nextCreases?

    clearGeometries();
    setMeshMaterial(params);

    function clearGeometries(){

        if (geometry) {
            frontside.geometry = null;
            backside.geometry = null;
            geometry.dispose();
        }

        geometry = new THREE.BufferGeometry();
        frontside.geometry = geometry;
        backside.geometry = geometry;
        // geometry.verticesNeedUpdate = true;
        geometry.dynamic = true;

        _.each(lines, function(line){
            var lineGeometry = line.geometry;
            if (lineGeometry) {
                line.geometry = null;
                lineGeometry.dispose();
            }

            lineGeometry = new THREE.BufferGeometry();
            line.geometry = lineGeometry;
            // lineGeometry.verticesNeedUpdate = true;
            lineGeometry.dynamic = true;
        });
    }


    /**
     *
     * @param params (optional)
     *          {
     *              colorMode: "color" (default), "normal", "axialStrain",
     *              frontColor: valid hex string, no #
     *              backColor: valid hex string, no #
     *          }
     *
     */
    function setMeshMaterial(params) {

        params = params || {};
        params.colorMode = params.colorMode || "color";
        params.frontColor = params.frontColor || frontColor || "ec008b";
        params.backColor = params.backColor || backColor || "dddddd";

        var polygonOffset = 0.5;
        if (params.colorMode == "normal") {
            material = new THREE.MeshNormalMaterial({
                flatShading:true,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
        } else if (params.colorMode == "axialStrain"){
            material = new THREE.MeshBasicMaterial({
                vertexColors: THREE.VertexColors, side:THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;

            //todo
            if (!globals.threeView.simulationRunning) {
                globals.Animator.render();
            }
        } else {
            material = new THREE.MeshPhongMaterial({
                flatShading:true,
                side:THREE.FrontSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            material2 = new THREE.MeshPhongMaterial({
                flatShading:true,
                side:THREE.BackSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            frontColor = params.frontColor;
            backColor = params.backColor;
            material.color.setStyle( "#" + params.frontColor);
            material2.color.setStyle( "#" + params.backColor);
            backside.visible = true;
        }
        frontside.material = material;
        backside.material = material2;
    }

    function setFrontColor(color){
        setMeshMaterial({colorMode: "color", frontColor:color});
    }

    function setBackColor(color){
        setMeshMaterial({colorMode: "color", backColor:color});
    }

    function setColorMode(mode){
        setMeshMaterial({colorMode: mode});
    }


    function updateEdgeVisibility(){
        mountainLines.visible = globals.edgesVisible && globals.mtnsVisible;
        valleyLines.visible = globals.edgesVisible && globals.valleysVisible;
        facetLines.visible = globals.edgesVisible && globals.panelsVisible;
        hingeLines.visible = globals.edgesVisible && globals.passiveEdgesVisible;
        borderLines.visible = globals.edgesVisible && globals.boundaryEdgesVisible;
        cutLines.visible = false;
    }

    function updateMeshVisibility(){
        frontside.visible = globals.meshVisible;
        backside.visible = globals.colorMode == "color" && globals.meshVisible;
    }

    function update(){
        setGeoUpdates();
    }

    function setGeoUpdates(){
        geometry.attributes.position.needsUpdate = true;
        if (globals.colorMode == "axialStrain") geometry.attributes.color.needsUpdate = true;
        if (globals.userInteractionEnabled || globals.vrEnabled) geometry.computeBoundingBox();
    }


    function setFoldData(fold, creaseParams){
        setFoldDataAsync(fold, creaseParams);
        sync();
    }

    /**
     * async version updates model on next render loop
     */
    function setFoldDataAsync(fold, creaseParams){

        if (fold.vertices_coords.length == 0) {
            var msg = "No geometry found.";
            console.warn(msg);
            if (globals && globals.warn) globals.warn(msg);
            return;
        }
        if (fold.faces_vertices.length == 0) {
            var msg = "No faces found, try adjusting import vertex merge tolerance.";
            console.warn(msg);
            if (globals && globals.warn) globals.warn(msg);
            return;
        }
        if (fold.edges_vertices.length == 0) {
            var msg = "No edges found.";
            console.warn(msg);
            globals.warn(msg);
            return;
        }

        //cue up for next iter
        nextFold = fold;
        nextCreaseParams = creaseParams;

        modelNeedsSync = true;

        globals.inited = true;//todo get rid of this
    }

    /**
     * need this to check while using async call
     */
    function needsSync(){
        return modelNeedsSync;
    }

    /**
     * sync with cued up fold (nextFold)
     */
    function sync(){

        for (var i=0;i<nodes.length;i++){
            nodes[i].destroy();
        }

        for (var i=0;i<edges.length;i++){
            edges[i].destroy();
        }

        for (var i=0;i<creases.length;i++){
            creases[i].destroy();
        }

        fold = nextFold;
        nodes = [];
        edges = [];
        faces = fold.faces_vertices;
        creases = [];
        creaseParams = nextCreaseParams;
        var _edges = fold.edges_vertices;

        var _vertices = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            var vertex = fold.vertices_coords[i];
            _vertices.push(new THREE.Vector3(vertex[0], vertex[1], vertex[2]));
        }

        for (var i=0;i<_vertices.length;i++){
            nodes.push(new Node(_vertices[i].clone(), nodes.length));
        }
        // _nodes[_faces[0][0]].setFixed(true);
        // _nodes[_faces[0][1]].setFixed(true);
        // _nodes[_faces[0][2]].setFixed(true);

        for (var i=0;i<_edges.length;i++) {
            edges.push(new Beam([nodes[_edges[i][0]], nodes[_edges[i][1]]]));
        }

        for (var i=0;i<creaseParams.length;i++) {//allCreaseParams.length
            var _creaseParams = creaseParams[i];//face1Ind, vert1Ind, face2Ind, ver2Ind, edgeInd, angle
            var type = _creaseParams[5]!=0 ? 1:0;
            //edge, face1Index, face2Index, targetTheta, type, node1, node2, index
            creases.push(new Crease(edges[_creaseParams[4]], _creaseParams[0], _creaseParams[2], _creaseParams[5], type, nodes[_creaseParams[1]], nodes[_creaseParams[3]], creases.length));
        }

        var vertices = [];
        for (var i=0;i<nodes.length;i++){
            vertices.push(nodes[i].getOriginalPosition());
        }

        positions = new Float32Array(vertices.length*3);
        colors = new Float32Array(vertices.length*3);
        var indices = new Uint16Array(faces.length*3);

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

        clearGeometries();

        var positionsAttribute = new THREE.BufferAttribute(positions, 3);

        var lineIndices = {
            U: [],
            V: [],
            M: [],
            B: [],
            F: [],
            C: []
        };
        for (var i=0;i<fold.edges_assignment.length;i++){
            var edge = fold.edges_vertices[i];
            var assignment = fold.edges_assignment[i];
            lineIndices[assignment].push(edge[0]);
            lineIndices[assignment].push(edge[1]);
        }
        _.each(lines, function(line, key){
            var indicesArray = lineIndices[key];
            var indices = new Uint16Array(indicesArray.length);
            for (var i=0;i<indicesArray.length;i++){
                indices[i] = indicesArray[i];
            }
            lines[key].geometry.addAttribute('position', positionsAttribute);
            lines[key].geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            // lines[key].geometry.attributes.position.needsUpdate = true;
            // lines[key].geometry.index.needsUpdate = true;
            lines[key].geometry.computeBoundingBox();
            lines[key].geometry.computeBoundingSphere();
            lines[key].geometry.center();
        });

        geometry.addAttribute('position', positionsAttribute);
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        // geometry.attributes.position.needsUpdate = true;
        // geometry.index.needsUpdate = true;
        // geometry.verticesNeedUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.center();

        var scale = 1/geometry.boundingSphere.radius;
        globals.scale = scale;

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

        updateEdgeVisibility();
        updateMeshVisibility();

        modelNeedsSync = false;
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

    function getObject3Ds(){
        return [
            frontside,
            backside,
            lines.U,
            lines.M,
            lines.V,
            lines.C,
            lines.F,
            lines.B
        ];
    }

    function getGeometry(){
        return geometry;
    }

    function getMesh(){
        return [frontside, backside];
    }

    function getPositionsArray(){
        return positions;
    }

    function getColorsArray(){
        return colors;
    }

    return {
        update: update,//update internal threejs geometry - call this after solver.render() and before THREE.renderer.render()

        //todo get rid of these
        getNodes: getNodes,
        getEdges: getEdges,
        getFaces: getFaces,
        getCreases: getCreases,

        getGeometry: getGeometry,//returns buffer geometry, for save stl
        getDimensions: getDimensions,//for save stl
        getMesh: getMesh,//for direct manipulation, actually returns two meshes [frontside, backside]
        getObject3Ds: getObject3Ds,//return array of all object3ds, so they can be added to threejs scene

        //for updating with solver - types arrays from buffer geometry
        getPositionsArray: getPositionsArray,
        getColorsArray: getColorsArray,

        setFoldData: setFoldData,//load new model

        //todo can get rid of this?
        //async methods - use these if you have an animation loop running, waits til next render cycle to load new geo
        setFoldDataAsync: setFoldDataAsync,//cues up next model to load
        needsSync: needsSync,
        sync: sync,//update geometry to new model

        //rendering
        setMeshMaterial: setMeshMaterial,
        setColorMode: setColorMode,
        setBackColor: setBackColor,
        setFrontColor: setFrontColor,

        updateEdgeVisibility: updateEdgeVisibility,
        updateMeshVisibility: updateMeshVisibility
    }
}