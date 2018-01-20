/**
 * Created by amandaghassaei on 2/24/17.
 */

//model updates object3d geometry and materials

function Model3D(params){

    var material, material2, geometry;
    var frontside = new THREE.Mesh();//front face of mesh
    var backside = new THREE.Mesh();//back face of mesh (different color)
    backside.visible = false;
    var frontColor, backColor;//colors used for mesh, hex strings
    var colorMode;

    var lineMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1});
    //each edge type is a separate LineSegments object - so visibility can be easily toggled
    var hingeLines = new THREE.LineSegments(null, lineMaterial);
    setHingeVisiblity(false);//default to no hinge vis
    var mountainLines = new THREE.LineSegments(null, lineMaterial);
    var valleyLines = new THREE.LineSegments(null, lineMaterial);
    var cutLines = new THREE.LineSegments(null, lineMaterial);
    var facetLines = new THREE.LineSegments(null, lineMaterial);
    setFacetVisiblity(false);//default to no facet vis
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
    var edges = [];
    var creases = [];

    var scale;//used in stl export

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
     * @param params (optional)
     *          {
     *              colorMode: "color" (default), "normal", "axialStrain",
     *              frontColor: valid hex string, no #
     *              backColor: valid hex string, no #
     *          }
     */
    function setMeshMaterial(params) {

        params = params || {};
        params.colorMode = params.colorMode || colorMode || "color";
        params.frontColor = params.frontColor || frontColor || "ec008b";
        params.backColor = params.backColor || backColor || "dddddd";
        colorMode = params.colorMode;

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

    function setEdgesVisibility(state){
        setMountainVisiblity(state);
        setValleyVisiblity(state);
        setFacetVisiblity(state);
        setHingeVisiblity(state);
        setBoundaryVisiblity(state);
    }

    function setMountainVisiblity(state){
        mountainLines.visible = state;
    }

    function setValleyVisiblity(state){
        valleyLines.visible = state;
    }

    function setFacetVisiblity(state){
        facetLines.visible = state;
    }

    function setHingeVisiblity(state){
        hingeLines.visible = state;
    }

    function setBoundaryVisiblity(state){
        borderLines.visible = state;
    }

    function setMeshVisibility(state){
        frontside.visible = state;
        backside.visible = colorMode == "color" && state;
    }


    /**
     * call update to set flags for next render
     */
    function update(shouldComputeBoundingBox){
        geometry.attributes.position.needsUpdate = true;
        if (colorMode == "axialStrain") geometry.attributes.color.needsUpdate = true;
        if (shouldComputeBoundingBox) geometry.computeBoundingBox();
    }



    function setFoldData(fold){

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
            if (globals && globals.warn) globals.warn(msg);
            return;
        }

        globals.inited = true;//todo get rid of this

        for (var i=0;i<nodes.length;i++){
            nodes[i].destroy();
        }

        for (var i=0;i<edges.length;i++){
            edges[i].destroy();
        }

        for (var i=0;i<creases.length;i++){
            creases[i].destroy();
        }

        nodes = [];
        edges = [];
        creases = [];
        var _edges = fold.edges_vertices;

        for (var i=0;i<fold.vertices_coords.length;i++){
            var vertex = fold.vertices_coords[i];
            nodes.push(new Node(new THREE.Vector3(vertex[0], vertex[1], vertex[2]), nodes.length));
        }
        // _nodes[_faces[0][0]].setFixed(true);
        // _nodes[_faces[0][1]].setFixed(true);
        // _nodes[_faces[0][2]].setFixed(true);

        for (var i=0;i<_edges.length;i++) {
            edges.push(new Beam([nodes[_edges[i][0]], nodes[_edges[i][1]]]));
        }

        var creaseParams = getFacesAndVerticesForEdges(fold);

        for (var i=0;i<creaseParams.length;i++) {//allCreaseParams.length
            var _creaseParams = creaseParams[i];//face1Ind, vert1Ind, face2Ind, ver2Ind, edgeInd, angle
            var type = _creaseParams[5]!=0 ? 1:0;
            //edge, face1Index, face2Index, targetTheta, type, node1, node2, index
            creases.push(new Crease(edges[_creaseParams[4]], _creaseParams[0], _creaseParams[2], _creaseParams[5], type, nodes[_creaseParams[1]], nodes[_creaseParams[3]], creases.length));
        }

        positions = new Float32Array(fold.vertices_coords.length*3);
        colors = new Float32Array(fold.vertices_coords.length*3);
        var indices = new Uint16Array(fold.faces_vertices.length*3);

        for (var i=0;i<fold.vertices_coords.length;i++){
            positions[3*i] = fold.vertices_coords[i][0];
            positions[3*i+1] = fold.vertices_coords[i][1];
            positions[3*i+2] = fold.vertices_coords[i][2];
        }
        for (var i=0;i<fold.faces_vertices.length;i++){
            var face = fold.faces_vertices[i];
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

        scale = 1/geometry.boundingSphere.radius;

        //scale geometry
        for (var i=0;i<positions.length;i++){
            positions[i] *= scale;
        }

        //scale fold geo to unit dimensions and return
        fold = JSON.parse(JSON.stringify(fold));//make a copy
        for (var i=0;i<fold.vertices_coords.length;i++){
            fold.vertices_coords[i][0] = positions[3*i];
            fold.vertices_coords[i][1] = positions[3*i+1];
            fold.vertices_coords[i][2] = positions[3*i+2];
        }

        //todo get rid of this - update vertices and edges
        for (var i=0;i<fold.vertices_coords.length;i++){
            nodes[i].setOriginalPosition(positions[3*i], positions[3*i+1], positions[3*i+2]);
        }
        for (var i=0;i<fold.edges_vertices.length;i++){
            edges[i].recalcOriginalLength();
        }

        setMeshVisibility(true);

        return fold;
    }

    //todo get rid of this
    function getFacesAndVerticesForEdges(fold){
        var allCreaseParams = [];//face1Ind, vertInd, face2Ind, ver2Ind, edgeInd, angle
        var faces = fold.faces_vertices;
        for (var i=0;i<fold.edges_vertices.length;i++){
            var assignment = fold.edges_assignment[i];
            if (assignment !== "M" && assignment !== "V" && assignment !== "F") continue;
            var edge = fold.edges_vertices[i];
            var v1 = edge[0];
            var v2 = edge[1];
            var creaseParams = [];
            for (var j=0;j<faces.length;j++){
                var face = faces[j];
                var faceVerts = [face[0], face[1], face[2]];
                var v1Index = faceVerts.indexOf(v1);
                if (v1Index>=0){
                    var v2Index = faceVerts.indexOf(v2);
                    if (v2Index>=0){
                        creaseParams.push(j);
                        if (v2Index>v1Index) {
                            faceVerts.splice(v2Index, 1);
                            faceVerts.splice(v1Index, 1);
                        } else {
                            faceVerts.splice(v1Index, 1);
                            faceVerts.splice(v2Index, 1);
                        }
                        creaseParams.push(faceVerts[0]);
                        if (creaseParams.length == 4) {

                            if (v2Index-v1Index == 1 || v2Index-v1Index == -2) {
                                creaseParams = [creaseParams[2], creaseParams[3], creaseParams[0], creaseParams[1]];
                            }

                            creaseParams.push(i);
                            var angle = fold.edges_foldAngles[i];
                            creaseParams.push(angle);
                            allCreaseParams.push(creaseParams);
                            break;
                        }
                    }
                }
            }
        }
        return allCreaseParams;
    }


    function getNodes(){
        return nodes;
    }

    function getEdges(){
        return edges;
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

    function getScale(){
        return scale;
    }

    return {
        //todo get rid of these
        getNodes: getNodes,
        getCreases: getCreases,

        setFoldData: setFoldData,//load new model

        //for updating with solver - typed arrays from buffer geometry
        getPositionsArray: getPositionsArray,
        getColorsArray: getColorsArray,

        update: update,//update internal threejs geometry - call this after solver.render() and before THREE.renderer.render()

        //rendering
        setColorMode: setColorMode,
        setBackColor: setBackColor,
        setFrontColor: setFrontColor,
        setEdgesVisibility: setEdgesVisibility,
        setMountainVisiblity: setMountainVisiblity,
        setValleyVisiblity: setValleyVisiblity,
        setFacetVisiblity: setFacetVisiblity,
        setHingeVisiblity: setHingeVisiblity,
        setBoundaryVisiblity: setBoundaryVisiblity,
        setMeshVisibility: setMeshVisibility,

        getGeometry: getGeometry,//returns buffer geometry, for save stl
        getDimensions: getDimensions,//return vector3, for save stl
        getMesh: getMesh,//for direct manipulation, actually returns two meshes [frontside, backside]
        getObject3Ds: getObject3Ds,//return array of all object3ds, so they can be added to threejs scene
        getScale: getScale//scale of mesh, used for stl export
    }
}