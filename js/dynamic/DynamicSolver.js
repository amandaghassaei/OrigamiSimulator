/**
 * Created by ghassaei on 10/7/16.
 */

function DynamicSolver($canvas){

    var gpuMath = GPUMath($canvas);
    var FOLD = require('fold');

    var forceHasChanged = false;
    var fixedHasChanged = false;

    var axialStiffness = 20;
    var materialHasChanged = false;

    var creaseStiffness = 0.7;
    var facetStiffness = 0.7;
    var creaseMaterialHasChanged = false;
    var damping = 0.85;

    var creasePercent = 1;

    var fold;

    //todo get rid of these
    var nodes = [];
    var edges = [];
    var creases = [];

    var originalPosition;
    var position;
    var lastPosition;
    var lastLastPosition;//for verlet integration
    var velocity;
    var lastVelocity;
    var externalForces;
    var mass;
    var meta;//[beamMetaIndex, numBeams, nodeCreaseMetaIndex, numCreases]
    var meta2;//[nodeFaceMetaIndex, numFaces]
    var beamMeta;//[K, rubberBandEdge, length, otherNodeIndex]

    var normals;
    var faceVertexIndices;//[a,b,c] textureDimFaces
    var nominalTriangles;//[angleA, angleB, angleC]
    var nodeFaceMeta;//[faceIndex, a, b, c] textureNodeFaces
    var creaseMeta;//[k, d, targetTheta, -] textureDimCreases
    var creaseMeta2;//[node1Index, node2Index, node3index, node4index]//nodes 1 and 2 are opposite crease, 3 and 4 are on crease, textureDimCreases
    var nodeCreaseMeta;//[creaseIndex (thetaIndex), nodeIndex (1/2/3/4), -, -] textureDimNodeCreases
    var creaseGeo;//[h1, h2, coef1, coef2]
    var creaseVectors;//indices of crease nodes
    var theta;//[theta, w, normalIndex1, normalIndex2]
    var lastTheta;//[theta, w, normalIndex1, normalIndex2]

    function setFold(_fold){

        //fold assumed to have vertices_coords, edges_vertices, edges_assignment, edges_foldAngles, faces_vertices
        fold = JSON.parse(JSON.stringify(_fold));//make copy
        if (!fold.vertices_edges) fold = edgesVerticesToVerticesEdges(fold);
        // if (!fold.vertices_vertices) fold = FOLD.convert.edges_vertices_to_vertices_vertices_unsorted(fold);
        if (!fold.vertices_faces) fold = facesVerticesToVerticesFaces(fold);
        if (!fold.vertices_fixed) fold = initFloatingConditions(fold);
        if (!fold.vertices_externalForce) fold = initZeroExternalForces(fold);

        //calc edge lengths
        fold = edgesVerticesToEdgesLengths(fold);

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

        for (var i=0;i<fold.vertices_coords.length;i++){
            var vertex = fold.vertices_coords[i];
            nodes.push(new Node(new THREE.Vector3(vertex[0], vertex[1], vertex[2]), nodes.length));
        }
        // _nodes[_faces[0][0]].setFixed(true);
        // _nodes[_faces[0][1]].setFixed(true);
        // _nodes[_faces[0][2]].setFixed(true);

        for (var i=0;i<fold.edges_vertices.length;i++) {
            edges.push(new Beam([nodes[fold.edges_vertices[i][0]], nodes[fold.edges_vertices[i][1]]]));
        }

        var creaseParams = getFacesAndVerticesForEdges(fold);

        for (var i=0;i<creaseParams.length;i++) {//allCreaseParams.length
            var _creaseParams = creaseParams[i];//face1Ind, vert1Ind, face2Ind, ver2Ind, edgeInd, angle
            var type = _creaseParams[5]!=0 ? 1:0;
            //edge, face1Index, face2Index, targetTheta, type, node1, node2, index
            creases.push(new Crease(edges[_creaseParams[4]], _creaseParams[0], _creaseParams[2], _creaseParams[5], type, nodes[_creaseParams[1]], nodes[_creaseParams[3]], creases.length));
        }

        //todo get rid of this - update vertices and edges
        for (var i=0;i<fold.vertices_coords.length;i++){
            var position = fold.vertices_coords[i];
            nodes[i].setOriginalPosition(position[0], position[1], position[2]);
        }
        for (var i=0;i<fold.edges_vertices.length;i++){
            edges[i].recalcOriginalLength();
        }

        initTypedArrays();
        initTexturesAndPrograms(gpuMath);
        setSolveParams();
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

    //todo this is duplicate from pattern importer
    function edgesVerticesToVerticesEdges(fold){
        var verticesEdges = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            verticesEdges.push([]);
        }
        for (var i=0;i<fold.edges_vertices.length;i++){
            var edge = fold.edges_vertices[i];
            verticesEdges[edge[0]].push(i);
            verticesEdges[edge[1]].push(i);
        }
        fold.vertices_edges = verticesEdges;
        return fold;
    }

    function facesVerticesToVerticesFaces(fold){
        var verticesFaces = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            verticesFaces.push([]);
        }
        for (var i=0;i<fold.faces_vertices.length;i++){
            var face = fold.faces_vertices[i];
            for (var j=0;j<face.length;j++){
                verticesFaces[face[j]].push(i);
            }
        }
        fold.vertices_faces = verticesFaces;
        return fold;
    }

    function edgesVerticesToEdgesLengths(fold){
        fold.edges_length = [];
        for (var i=0;i<fold.edges_vertices.length;i++){
            var edge = fold.edges_vertices[i];
            var vertex1 = fold.vertices_coords[edge[0]];
            var vertex2 = fold.vertices_coords[edge[1]];
            var diff = [vertex1[0]-vertex2[0], vertex1[1]-vertex2[1], vertex1[2]-vertex2[2]];
            fold.edges_length.push(Math.sqrt(diff[0]*diff[0] + diff[1]*diff[1] + diff[2]*diff[2]));
        }
        return fold;
    }

    function initFloatingConditions(fold){
        fold.vertices_fixed = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            fold.vertices_fixed.push(0);
        }
        return fold;
    }

    function initZeroExternalForces(fold){
        fold.vertices_externalForce = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            fold.vertices_externalForce.push([0,0,0]);
        }
        return fold;
    }


    function setFixedVertices(fixed){
        for (var i=0;i<fixed.length;i++){
            fold.vertices_fixed[i] = fixed[i] ? 1 : 0;
        }
        fixedHasChanged = true;
    }

    function fixVertexAtIndex(index, state){
        fold.vertices_fixed[index] = state ? 1 : 0;
        fixedHasChanged = true;
    }

    function setExternalForces(forces){
        for (var i=0;i<forces.length;i++){
            fold.vertices_externalForce[i] = forces[i];
        }
        forceHasChanged = true;
    }

    function setForceAtIndex(index, force){
        fold.vertices_externalForce[index] = force;
        forceHasChanged = true;
    }


    var programsInited = false;//flag for initial setup

    var textureDim = 0;
    var textureDimEdges = 0;
    var textureDimFaces = 0;
    var textureDimCreases = 0;
    var textureDimNodeCreases = 0;
    var textureDimNodeFaces = 0;

    function reset(){
        gpuMath.step("zeroTexture", [], "u_position");
        gpuMath.step("zeroTexture", [], "u_lastPosition");
        gpuMath.step("zeroTexture", [], "u_lastLastPosition");
        gpuMath.step("zeroTexture", [], "u_velocity");
        gpuMath.step("zeroTexture", [], "u_lastVelocity");
        gpuMath.step("zeroThetaTexture", ["u_lastTheta"], "u_theta");
        gpuMath.step("zeroThetaTexture", ["u_theta"], "u_lastTheta");
    }

    function stepForward(params){

        params = params || {};

        params.numSteps = params.numSteps || 1;
        if (params.numSteps<1){
            console.warn("num steps must be > 0");
            params.numSteps = 1;
        }
        params.integrationType = params.integrationType || "euler";

        //update boundary conditions
        if (forceHasChanged) updateExternalForces();
        if (fixedHasChanged) updateFixed();

        // if (globals.nodePositionHasChanged) {
        //     updateLastPosition();
        //     globals.nodePositionHasChanged = false;
        // }

        //update sim params
        if (creaseMaterialHasChanged) updateCreasesMeta();
        if (materialHasChanged) updateMaterials();

        // if (globals.shouldZeroDynamicVelocity){
        //     gpuMath.step("zeroTexture", [], "u_velocity");
        //     gpuMath.step("zeroTexture", [], "u_lastVelocity");
        //     globals.shouldZeroDynamicVelocity = false;
        // }

        for (var j=0;j<params.numSteps;j++){
            solveSingleStep(params);
        }
    }

    function solveSingleStep(params){

        gpuMath.setProgram("normalCalc");
        gpuMath.setSize(textureDimFaces, textureDimFaces);
        gpuMath.step("normalCalc", ["u_faceVertexIndices", "u_lastPosition", "u_originalPosition"], "u_normals");

        gpuMath.setProgram("thetaCalc");
        gpuMath.setSize(textureDimCreases, textureDimCreases);
        gpuMath.step("thetaCalc", ["u_normals", "u_lastTheta", "u_creaseVectors", "u_lastPosition",
            "u_originalPosition"], "u_theta");

        gpuMath.setProgram("updateCreaseGeo");
        //already at textureDimCreasesxtextureDimCreases
        gpuMath.step("updateCreaseGeo", ["u_lastPosition", "u_originalPosition", "u_creaseMeta2"], "u_creaseGeo");

        if (params.integrationType == "verlet"){
            gpuMath.setProgram("positionCalcVerlet");
            gpuMath.setSize(textureDim, textureDim);
            gpuMath.step("positionCalcVerlet", ["u_lastPosition", "u_lastLastPosition", "u_lastVelocity", "u_originalPosition", "u_externalForces",
                "u_mass", "u_meta", "u_beamMeta", "u_creaseMeta", "u_nodeCreaseMeta", "u_normals", "u_theta", "u_creaseGeo",
                "u_meta2", "u_nodeFaceMeta", "u_nominalTriangles"], "u_position");
            gpuMath.step("velocityCalcVerlet", ["u_position", "u_lastPosition", "u_mass"], "u_velocity");
            gpuMath.swapTextures("u_lastPosition", "u_lastLastPosition");
        } else {//euler
            gpuMath.setProgram("velocityCalc");
            gpuMath.setSize(textureDim, textureDim);
            gpuMath.step("velocityCalc", ["u_lastPosition", "u_lastVelocity", "u_originalPosition", "u_externalForces",
                "u_mass", "u_meta", "u_beamMeta", "u_creaseMeta", "u_nodeCreaseMeta", "u_normals", "u_theta", "u_creaseGeo",
                "u_meta2", "u_nodeFaceMeta", "u_nominalTriangles"], "u_velocity");
            gpuMath.step("positionCalc", ["u_velocity", "u_lastPosition", "u_mass"], "u_position");
        }

        gpuMath.swapTextures("u_theta", "u_lastTheta");
        gpuMath.swapTextures("u_velocity", "u_lastVelocity");
        gpuMath.swapTextures("u_position", "u_lastPosition");
    }

    var $errorOutput = $("#globalError");

    function updateModel3DGeometry(model, params){

        params = params || {};

        // var vectorLength = 2;
        // gpuMath.setProgram("packToBytes");
        // gpuMath.setUniformForProgram("packToBytes", "u_vectorLength", vectorLength, "1f");
        // gpuMath.setUniformForProgram("packToBytes", "u_floatTextureDim", [textureDimCreases, textureDimCreases], "2f");
        // gpuMath.setSize(textureDimCreases*vectorLength, textureDimCreases);
        // gpuMath.step("packToBytes", ["u_lastTheta"], "outputBytes");
        //
        // if (gpuMath.readyToRead()) {
        //     var numPixels = nodes.length*vectorLength;
        //     var height = Math.ceil(numPixels/(textureDimCreases*vectorLength));
        //     var pixels = new Uint8Array(height*textureDimCreases*4*vectorLength);
        //     gpuMath.readPixels(0, 0, textureDimCreases * vectorLength, height, pixels);
        //     var parsedPixels = new Float32Array(pixels.buffer);
        //     for (var i=0;i<parsedPixels.length;i+=2){
        //         if (Math.abs(parsedPixels[i+1])>Math.PI-1) {
        //             console.log(parsedPixels[i+1]);//theta
        //         }
        //
        //     }
        // } else {
        //     console.log("here");
        // }

        var positions = model.getPositionsArray();
        var colors;
        if (params.colorMode == "axialStrain") colors = model.getColorsArray();

        var vectorLength = 4;
        gpuMath.setProgram("packToBytes");
        gpuMath.setUniformForProgram("packToBytes", "u_vectorLength", vectorLength, "1f");
        gpuMath.setUniformForProgram("packToBytes", "u_floatTextureDim", [textureDim, textureDim], "2f");
        gpuMath.setSize(textureDim*vectorLength, textureDim);
        gpuMath.step("packToBytes", ["u_lastPosition"], "outputBytes");

        var numVertices = fold.vertices_coords.length;

        if (gpuMath.readyToRead()) {
            var numPixels = numVertices*vectorLength;
            var height = Math.ceil(numPixels/(textureDim*vectorLength));
            var pixels = new Uint8Array(height*textureDim*4*vectorLength);
            gpuMath.readPixels(0, 0, textureDim * vectorLength, height, pixels);
            var parsedPixels = new Float32Array(pixels.buffer);
            var globalError = 0;
            var shouldUpdateColors = params.colorMode == "axialStrain";
            for (var i = 0; i < numVertices; i++) {
                var rgbaIndex = i * vectorLength;
                var nodeError = parsedPixels[rgbaIndex+3]*100;
                globalError += nodeError;
                var originalPosition = fold.vertices_coords[i];
                positions[3*i] = parsedPixels[rgbaIndex]+originalPosition[0];
                positions[3*i+1] = parsedPixels[rgbaIndex + 1]+originalPosition[1];
                positions[3*i+2] = parsedPixels[rgbaIndex + 2]+originalPosition[2];
                if (shouldUpdateColors){
                    if (nodeError>params.strainClip) nodeError = params.strainClip;
                    var scaledVal = (1-nodeError/params.strainClip) * 0.7;
                    var color = new THREE.Color();
                    color.setHSL(scaledVal, 1, 0.5);
                    colors[3*i] = color.r;
                    colors[3*i+1] = color.g;
                    colors[3*i+2] = color.b;
                }
            }
            $errorOutput.html((globalError/numVertices).toFixed(7) + " %");
        } else {
            console.log("shouldn't be here");
        }
        model.update();
    }

    function setSolveParams(){
        var dt = calcDt();
        $("#deltaT").html(dt);
        gpuMath.setProgram("thetaCalc");
        gpuMath.setUniformForProgram("thetaCalc", "u_dt", dt, "1f");
        gpuMath.setProgram("velocityCalc");
        gpuMath.setUniformForProgram("velocityCalc", "u_dt", dt, "1f");
        gpuMath.setProgram("positionCalcVerlet");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_dt", dt, "1f");
        gpuMath.setProgram("positionCalc");
        gpuMath.setUniformForProgram("positionCalc", "u_dt", dt, "1f");
        gpuMath.setProgram("velocityCalcVerlet");
        gpuMath.setUniformForProgram("velocityCalcVerlet", "u_dt", dt, "1f");
        // globals.controls.setDeltaT(dt);//todo fix this
    }

    function calcDt(){
        var maxFreqNat = 0;
        for (var i=0;i<fold.edges_length.length;i++){
            var natFreq = getNaturalFrequency(fold.edges_length[i]);
            if (natFreq>maxFreqNat) maxFreqNat = natFreq;
        }
        return (1/(2*Math.PI*maxFreqNat))*0.9;//0.9 of max delta t for good measure
    }

    function getNaturalFrequency(length){
        return Math.sqrt(getAxialK(length)/1);//this.getMinMass()); - min mass is always returning 1 currently
    }

    function getAxialK(length){
        return axialStiffness/length;
    }

    // function getAxialD(length){
    //     return damping*2*Math.sqrt(getAxialK(length));//*this.getMinMass()); - min mass is always returning 1
    // }

    function getCreaseK(length, assignment){
        if (assignment == "F") return facetStiffness*length;
        return creaseStiffness*length;
    }

    // function getCreaseD(length, assignment){
    //     return damping*2*Math.sqrt(getCreaseK(length, assignment));
    // }

    function getOtherVertex(edgeVertexIndices, nodeIndex){
        if (edgeVertexIndices[0] == nodeIndex) return edgeVertexIndices[1];
        return edgeVertexIndices[0];
    }


    function initTexturesAndPrograms(gpuMath){

        var vertexShader = document.getElementById("vertexShader").text;

        gpuMath.initTextureFromData("u_position", textureDim, textureDim, "FLOAT", position, true);
        gpuMath.initTextureFromData("u_lastPosition", textureDim, textureDim, "FLOAT", lastPosition, true);
        gpuMath.initTextureFromData("u_lastLastPosition", textureDim, textureDim, "FLOAT", lastLastPosition, true);
        gpuMath.initTextureFromData("u_velocity", textureDim, textureDim, "FLOAT", velocity, true);
        gpuMath.initTextureFromData("u_lastVelocity", textureDim, textureDim, "FLOAT", lastVelocity, true);
        gpuMath.initTextureFromData("u_theta", textureDimCreases, textureDimCreases, "FLOAT", theta, true);
        gpuMath.initTextureFromData("u_lastTheta", textureDimCreases, textureDimCreases, "FLOAT", lastTheta, true);
        gpuMath.initTextureFromData("u_normals", textureDimFaces, textureDimFaces, "FLOAT", normals, true);

        gpuMath.initFrameBufferForTexture("u_position", true);
        gpuMath.initFrameBufferForTexture("u_lastPosition", true);
        gpuMath.initFrameBufferForTexture("u_lastLastPosition", true);
        gpuMath.initFrameBufferForTexture("u_velocity", true);
        gpuMath.initFrameBufferForTexture("u_lastVelocity", true);
        gpuMath.initFrameBufferForTexture("u_theta", true);
        gpuMath.initFrameBufferForTexture("u_lastTheta", true);
        gpuMath.initFrameBufferForTexture("u_normals", true);

        gpuMath.initTextureFromData("u_meta", textureDim, textureDim, "FLOAT", meta, true);
        gpuMath.initTextureFromData("u_meta2", textureDim, textureDim, "FLOAT", meta2, true);
        gpuMath.initTextureFromData("u_nominalTrinagles", textureDimFaces, textureDimFaces, "FLOAT", nominalTriangles, true);
        gpuMath.initTextureFromData("u_nodeCreaseMeta", textureDimNodeCreases, textureDimNodeCreases, "FLOAT", nodeCreaseMeta, true);
        gpuMath.initTextureFromData("u_creaseMeta2", textureDimCreases, textureDimCreases, "FLOAT", creaseMeta2, true);
        gpuMath.initTextureFromData("u_nodeFaceMeta", textureDimNodeFaces, textureDimNodeFaces, "FLOAT", nodeFaceMeta, true);
        gpuMath.initTextureFromData("u_creaseGeo", textureDimCreases, textureDimCreases, "FLOAT", creaseGeo, true);
        gpuMath.initFrameBufferForTexture("u_creaseGeo", true);
        gpuMath.initTextureFromData("u_faceVertexIndices", textureDimFaces, textureDimFaces, "FLOAT", faceVertexIndices, true);
        gpuMath.initTextureFromData("u_nominalTriangles", textureDimFaces, textureDimFaces, "FLOAT", nominalTriangles, true);

        gpuMath.createProgram("positionCalc", vertexShader, document.getElementById("positionCalcShader").text);
        gpuMath.setUniformForProgram("positionCalc", "u_velocity", 0, "1i");
        gpuMath.setUniformForProgram("positionCalc", "u_lastPosition", 1, "1i");
        gpuMath.setUniformForProgram("positionCalc", "u_mass", 2, "1i");
        gpuMath.setUniformForProgram("positionCalc", "u_textureDim", [textureDim, textureDim], "2f");

        gpuMath.createProgram("velocityCalcVerlet", vertexShader, document.getElementById("velocityCalcVerletShader").text);
        gpuMath.setUniformForProgram("velocityCalcVerlet", "u_position", 0, "1i");
        gpuMath.setUniformForProgram("velocityCalcVerlet", "u_lastPosition", 1, "1i");
        gpuMath.setUniformForProgram("velocityCalcVerlet", "u_mass", 2, "1i");
        gpuMath.setUniformForProgram("velocityCalcVerlet", "u_textureDim", [textureDim, textureDim], "2f");

        gpuMath.createProgram("velocityCalc", vertexShader, document.getElementById("velocityCalcShader").text);
        gpuMath.setUniformForProgram("velocityCalc", "u_lastPosition", 0, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_lastVelocity", 1, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_originalPosition", 2, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_externalForces", 3, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_mass", 4, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_meta", 5, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_beamMeta", 6, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_creaseMeta", 7, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_nodeCreaseMeta", 8, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_normals", 9, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_theta", 10, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_creaseGeo", 11, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_meta2", 12, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_nodeFaceMeta", 13, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_nominalTriangles", 14, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDim", [textureDim, textureDim], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimEdges", [textureDimEdges, textureDimEdges], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimFaces", [textureDimFaces, textureDimFaces], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimCreases", [textureDimCreases, textureDimCreases], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimNodeCreases", [textureDimNodeCreases, textureDimNodeCreases], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimNodeFaces", [textureDimNodeFaces, textureDimNodeFaces], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_creasePercent", creasePercent, "1f");
        gpuMath.setUniformForProgram("velocityCalc", "u_axialStiffness", axialStiffness, "1f");
        gpuMath.setUniformForProgram("velocityCalc", "u_dampingPercent", damping, "1f");


        gpuMath.createProgram("positionCalcVerlet", vertexShader, document.getElementById("positionCalcVerletShader").text);
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_lastPosition", 0, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_lastLastPosition", 1, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_lastVelocity", 2, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_originalPosition", 3, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_externalForces", 4, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_mass", 5, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_meta", 6, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_beamMeta", 7, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_creaseMeta", 8, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_nodeCreaseMeta", 9, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_normals", 10, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_theta", 11, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_creaseGeo", 12, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_meta2", 13, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_nodeFaceMeta", 14, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_nominalTriangles", 15, "1i");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_textureDim", [textureDim, textureDim], "2f");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_textureDimEdges", [textureDimEdges, textureDimEdges], "2f");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_textureDimFaces", [textureDimFaces, textureDimFaces], "2f");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_textureDimCreases", [textureDimCreases, textureDimCreases], "2f");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_textureDimNodeCreases", [textureDimNodeCreases, textureDimNodeCreases], "2f");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_textureDimNodeFaces", [textureDimNodeFaces, textureDimNodeFaces], "2f");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_creasePercent", creasePercent, "1f");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_axialStiffness", axialStiffness, "1f");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_dampingPercent", damping, "1f");

        gpuMath.createProgram("thetaCalc", vertexShader, document.getElementById("thetaCalcShader").text);
        gpuMath.setUniformForProgram("thetaCalc", "u_normals", 0, "1i");
        gpuMath.setUniformForProgram("thetaCalc", "u_lastTheta", 1, "1i");
        gpuMath.setUniformForProgram("thetaCalc", "u_creaseVectors", 2, "1i");
        gpuMath.setUniformForProgram("thetaCalc", "u_lastPosition", 3, "1i");
        gpuMath.setUniformForProgram("thetaCalc", "u_originalPosition", 4, "1i");
        gpuMath.setUniformForProgram("thetaCalc", "u_textureDim", [textureDim, textureDim], "2f");
        gpuMath.setUniformForProgram("thetaCalc", "u_textureDimFaces", [textureDimFaces, textureDimFaces], "2f");
        gpuMath.setUniformForProgram("thetaCalc", "u_textureDimCreases", [textureDimCreases, textureDimCreases], "2f");

        gpuMath.createProgram("normalCalc", vertexShader, document.getElementById("normalCalc").text);
        gpuMath.setUniformForProgram("normalCalc", "u_faceVertexIndices", 0, "1i");
        gpuMath.setUniformForProgram("normalCalc", "u_lastPosition", 1, "1i");
        gpuMath.setUniformForProgram("normalCalc", "u_originalPosition", 2, "1i");
        gpuMath.setUniformForProgram("normalCalc", "u_textureDim", [textureDim, textureDim], "2f");
        gpuMath.setUniformForProgram("normalCalc", "u_textureDimFaces", [textureDimFaces, textureDimFaces], "2f");

        gpuMath.createProgram("packToBytes", vertexShader, document.getElementById("packToBytesShader").text);
        gpuMath.initTextureFromData("outputBytes", textureDim*4, textureDim, "UNSIGNED_BYTE", null, true);
        gpuMath.initFrameBufferForTexture("outputBytes", true);
        gpuMath.setUniformForProgram("packToBytes", "u_floatTextureDim", [textureDim, textureDim], "2f");
        gpuMath.setUniformForProgram("packToBytes", "u_floatTexture", 0, "1i");

        gpuMath.createProgram("zeroTexture", vertexShader, document.getElementById("zeroTexture").text);
        gpuMath.createProgram("zeroThetaTexture", vertexShader, document.getElementById("zeroThetaTexture").text);
        gpuMath.setUniformForProgram("zeroThetaTexture", "u_theta", 0, "1i");
        gpuMath.setUniformForProgram("zeroThetaTexture", "u_textureDimCreases", [textureDimCreases, textureDimCreases], "2f");

        gpuMath.createProgram("centerTexture", vertexShader, document.getElementById("centerTexture").text);
        gpuMath.setUniformForProgram("centerTexture", "u_lastPosition", 0, "1i");
        gpuMath.setUniformForProgram("centerTexture", "u_textureDim", [textureDim, textureDim], "2f");

        gpuMath.createProgram("copyTexture", vertexShader, document.getElementById("copyTexture").text);
        gpuMath.setUniformForProgram("copyTexture", "u_orig", 0, "1i");
        gpuMath.setUniformForProgram("copyTexture", "u_textureDim", [textureDim, textureDim], "2f");

        gpuMath.createProgram("updateCreaseGeo", vertexShader, document.getElementById("updateCreaseGeo").text);
        gpuMath.setUniformForProgram("updateCreaseGeo", "u_lastPosition", 0, "1i");
        gpuMath.setUniformForProgram("updateCreaseGeo", "u_originalPosition", 1, "1i");
        gpuMath.setUniformForProgram("updateCreaseGeo", "u_creaseMeta2", 2, "1i");
        gpuMath.setUniformForProgram("updateCreaseGeo", "u_textureDim", [textureDim, textureDim], "2f");
        gpuMath.setUniformForProgram("updateCreaseGeo", "u_textureDimCreases", [textureDimCreases, textureDimCreases], "2f");

        gpuMath.setSize(textureDim, textureDim);

        programsInited = true;
    }

    function calcTextureSize(numNodes){
        if (numNodes == 1) return 2;
        for (var i=0;i<numNodes;i++){
            if (Math.pow(2, 2*i) >= numNodes){
                return Math.pow(2, i);
            }
        }
        console.warn("no texture size found for " + numNodes + " items");
        return 2;
    }

    function updateMaterials(initing){
        var index = 0;
        for (var i=0;i<fold.vertices_coords.length;i++){
            var adjacentEdges = fold.vertices_edges[i];
            if (initing) {
                meta[4*i] = index;
                meta[4*i+1] = adjacentEdges.length;
            }
            for (var j=0;j<adjacentEdges.length;j++){
                var edgeIndex = adjacentEdges[j];
                beamMeta[4*index] = getAxialK(fold.edges_length[edgeIndex]);
                beamMeta[4*index+1] = fold.edges_assignment[edgeIndex] == "P" ? 1 : 0;//constraint edge flag
                if (initing) {
                    beamMeta[4*index+2] = fold.edges_length[edgeIndex];
                    beamMeta[4*index+3] = getOtherVertex(fold.edges_vertices[edgeIndex], i);
                }
                index+=1;
            }
        }
        gpuMath.initTextureFromData("u_beamMeta", textureDimEdges, textureDimEdges, "FLOAT", beamMeta, true);
        materialHasChanged = false;

        if (programsInited) {
            gpuMath.setProgram("velocityCalc");
            gpuMath.setUniformForProgram("velocityCalc", "u_axialStiffness", axialStiffness, "1f");
            gpuMath.setUniformForProgram("velocityCalc", "u_dampingPercent", damping, "1f");
            gpuMath.setProgram("positionCalcVerlet");
            gpuMath.setUniformForProgram("positionCalcVerlet", "u_axialStiffness", axialStiffness, "1f");
            gpuMath.setUniformForProgram("positionCalcVerlet", "u_dampingPercent", damping, "1f");
            setSolveParams();//recalc dt
        }
    }

    function updateExternalForces(){
        for (var i=0;i<fold.vertices_externalForce.length;i++){
            var externalForce = fold.vertices_externalForce[i];
            externalForces[4*i] = externalForce[0];
            externalForces[4*i+1] = externalForce[1];
            externalForces[4*i+2] = externalForce[2];
        }
        gpuMath.initTextureFromData("u_externalForces", textureDim, textureDim, "FLOAT", externalForces, true);
        forceHasChanged = false;
    }

    function updateFixed(){
        for (var i=0;i<fold.vertices_fixed.length;i++){
            mass[4*i+1] = fold.vertices_fixed[i];
        }
        gpuMath.initTextureFromData("u_mass", textureDim, textureDim, "FLOAT", mass, true);
        fixedHasChanged = false;
    }

    function updateOriginalPosition(){
        for (var i=0;i<fold.vertices_coords.length;i++){
            var origPosition = fold.vertices_coords[i];
            originalPosition[4*i] = origPosition[0];
            originalPosition[4*i+1] = origPosition[1];
            originalPosition[4*i+2] = origPosition[2];
        }
        gpuMath.initTextureFromData("u_originalPosition", textureDim, textureDim, "FLOAT", originalPosition, true);
    }

    function updateCreaseVectors(){
        for (var i=0;i<creases.length;i++){
            var rgbaIndex = i*4;
            var nodes = creases[i].edge.nodes;
            // this.vertices[1].clone().sub(this.vertices[0]);
            creaseVectors[rgbaIndex] = nodes[0].getIndex();
            creaseVectors[rgbaIndex+1] = nodes[1].getIndex();
        }
        gpuMath.initTextureFromData("u_creaseVectors", textureDimCreases, textureDimCreases, "FLOAT", creaseVectors, true);
    }

    function updateCreasesMeta(initing){
        for (var i=0;i<creases.length;i++){
            var crease = creases[i];
            var assignment = "M";
            if (crease.type == 1) assignment = "F";
            creaseMeta[i*4] = getCreaseK(crease.getLength(), assignment);
            // creaseMeta[i*4+1] = crease.getD();
            if (initing) creaseMeta[i*4+2] = crease.getTargetTheta();
        }
        gpuMath.initTextureFromData("u_creaseMeta", textureDimCreases, textureDimCreases, "FLOAT", creaseMeta, true);
        creaseMaterialHasChanged = false;
    }

    function updateLastPosition(){
        for (var i=0;i<nodes.length;i++){
            var _position = nodes[i].getRelativePosition();
            lastPosition[4*i] = _position.x;
            lastPosition[4*i+1] = _position.y;
            lastPosition[4*i+2] = _position.z;
        }
        gpuMath.initTextureFromData("u_lastPosition", textureDim, textureDim, "FLOAT", lastPosition, true);
        gpuMath.initFrameBufferForTexture("u_lastPosition", true);

    }

    function setCreasePercent(percent){
        creasePercent = percent;
        if (!programsInited) return;
        gpuMath.setProgram("velocityCalc");
        gpuMath.setUniformForProgram("velocityCalc", "u_creasePercent", percent, "1f");
        gpuMath.setProgram("positionCalcVerlet");
        gpuMath.setUniformForProgram("positionCalcVerlet", "u_creasePercent", percent, "1f");
    }

    function initTypedArrays(){

        textureDim = calcTextureSize(fold.vertices_coords.length);

        var numNodeFaces = 0;
        for (var i=0;i<fold.vertices_faces.length;i++){
            numNodeFaces += fold.vertices_faces[i].length;
        }
        textureDimNodeFaces = calcTextureSize(numNodeFaces);

        var numEdges = 0;
        for (var i=0;i<fold.vertices_edges.length;i++){
            numEdges += fold.vertices_edges[i].length;
        }
        textureDimEdges = calcTextureSize(numEdges);

        var numCreases = creases.length;
        textureDimCreases = calcTextureSize(numCreases);

        var numNodeCreases = 0;
        for (var i=0;i<nodes.length;i++){
            numNodeCreases += nodes[i].numCreases();
        }
        numNodeCreases += numCreases*2;//reactions
        textureDimNodeCreases = calcTextureSize(numNodeCreases);

        var numFaces = fold.faces_vertices.length;
        textureDimFaces = calcTextureSize(numFaces);

        originalPosition = new Float32Array(textureDim*textureDim*4);
        position = new Float32Array(textureDim*textureDim*4);
        lastPosition = new Float32Array(textureDim*textureDim*4);
        lastLastPosition = new Float32Array(textureDim*textureDim*4);
        velocity = new Float32Array(textureDim*textureDim*4);
        lastVelocity = new Float32Array(textureDim*textureDim*4);
        externalForces = new Float32Array(textureDim*textureDim*4);
        mass = new Float32Array(textureDim*textureDim*4);
        meta = new Float32Array(textureDim*textureDim*4);
        meta2 = new Float32Array(textureDim*textureDim*4);
        beamMeta = new Float32Array(textureDimEdges*textureDimEdges*4);

        normals = new Float32Array(textureDimFaces*textureDimFaces*4);
        faceVertexIndices = new Float32Array(textureDimFaces*textureDimFaces*4);
        creaseMeta = new Float32Array(textureDimCreases*textureDimCreases*4);
        nodeFaceMeta = new Float32Array(textureDimNodeFaces*textureDimNodeFaces*4);
        nominalTriangles = new Float32Array(textureDimFaces*textureDimFaces*4);
        nodeCreaseMeta = new Float32Array(textureDimNodeCreases*textureDimNodeCreases*4);
        creaseMeta2 = new Float32Array(textureDimCreases*textureDimCreases*4);
        creaseGeo = new Float32Array(textureDimCreases*textureDimCreases*4);
        creaseVectors = new Float32Array(textureDimCreases*textureDimCreases*4);
        theta = new Float32Array(textureDimCreases*textureDimCreases*4);
        lastTheta = new Float32Array(textureDimCreases*textureDimCreases*4);

        for (var i=0;i<fold.faces_vertices.length;i++){
            var face = fold.faces_vertices[i];
            faceVertexIndices[4*i] = face[0];
            faceVertexIndices[4*i+1] = face[1];
            faceVertexIndices[4*i+2] = face[2];

            var a = makeVector3(fold.vertices_coords[face[0]]);
            var b = makeVector3(fold.vertices_coords[face[1]]);
            var c = makeVector3(fold.vertices_coords[face[2]]);
            var ab = (b.clone().sub(a)).normalize();
            var ac = (c.clone().sub(a)).normalize();
            var bc = (c.clone().sub(b)).normalize();
            nominalTriangles[4*i] = Math.acos(ab.dot(ac));
            nominalTriangles[4*i+1] = Math.acos(-1*ab.dot(bc));
            nominalTriangles[4*i+2] = Math.acos(ac.dot(bc));

            if (Math.abs(nominalTriangles[4*i]+nominalTriangles[4*i+1]+nominalTriangles[4*i+2]-Math.PI)>0.1){
                console.warn("bad angles");
            }
        }


        for (var i=0;i<textureDim*textureDim;i++){
            mass[4*i+1] = 1;//set all fixed by default
        }

        for (var i=0;i<textureDimCreases*textureDimCreases;i++){
            if (i >= numCreases){
                lastTheta[i*4+2] = -1;
                lastTheta[i*4+3] = -1;
                continue;
            }
            lastTheta[i*4+2] = creases[i].getNormal1Index();
            lastTheta[i*4+3] = creases[i].getNormal2Index();
        }

        var index = 0;
        for (var i=0;i<fold.vertices_faces.length;i++){
            meta2[4*i] = index;
            var vertex_faces = fold.vertices_faces[i];
            var num = vertex_faces.length;
            meta2[4*i+1] = num;
            for (var j=0;j<num;j++){
                var _index = (index+j)*4;
                var face = fold.faces_vertices[vertex_faces[j]];
                nodeFaceMeta[_index] = vertex_faces[j];//face index
                nodeFaceMeta[_index+1] = face[0] == i ? -1 : face[0];
                nodeFaceMeta[_index+2] = face[1] == i ? -1 : face[1];
                nodeFaceMeta[_index+3] = face[2] == i ? -1 : face[2];
            }
            index+=num;
        }

        var index = 0;
        for (var i=0;i<nodes.length;i++){
            mass[4*i] = 1;//nodes[i].getSimMass();
            meta[i*4+2] = index;
            var nodeCreases = nodes[i].creases;
            var nodeInvCreases = nodes[i].invCreases;//nodes attached to crease move in opposite direction
            // console.log(nodeInvCreases);
            meta[i*4+3] = nodeCreases.length + nodeInvCreases.length;
            for (var j=0;j<nodeCreases.length;j++){
                nodeCreaseMeta[index*4] = nodeCreases[j].getIndex();
                nodeCreaseMeta[index*4+1] = nodeCreases[j].getNodeIndex(nodes[i]);//type 1, 2, 3, 4
                index++;
            }
            for (var j=0;j<nodeInvCreases.length;j++){
                nodeCreaseMeta[index*4] = nodeInvCreases[j].getIndex();
                nodeCreaseMeta[index*4+1] = nodeInvCreases[j].getNodeIndex(nodes[i]);//type 1, 2, 3, 4
                index++;
            }
        }
        for (var i=0;i<creases.length;i++){
            var crease = creases[i];
            creaseMeta2[i*4] = crease.node1.getIndex();
            creaseMeta2[i*4+1] = crease.node2.getIndex();
            creaseMeta2[i*4+2] = crease.edge.nodes[0].getIndex();
            creaseMeta2[i*4+3] = crease.edge.nodes[1].getIndex();
            index++;
        }

        updateOriginalPosition();
        updateMaterials(true);
        updateFixed();
        updateExternalForces();
        updateCreasesMeta(true);
        updateCreaseVectors();
        setCreasePercent(creasePercent);
    }

    function makeVector3(v){
        return new THREE.Vector3(v[0], v[1], v[2]);
    }

    function getNodes(){
        return nodes;
    }

    function getCreases(){
        return creases;
    }

    function setAxialStiffness(stiffness){
        axialStiffness = stiffness;
        materialHasChanged = true;
    }

    function setFacetStiffness(stiffness){
        facetStiffness = stiffness;
        creaseMaterialHasChanged = true;
    }

    function setCreaseStiffness(stiffness){
        creaseStiffness = stiffness;
        creaseMaterialHasChanged = true;
    }

    function setDamping(d){
        damping = d;
        materialHasChanged = true;
    }

    function reCenter(centerPosition){
        gpuMath.setProgram("centerTexture");
        gpuMath.setUniformForProgram("centerTexture", "u_center", [centerPosition.x, centerPosition.y, centerPosition.z], "3f");
        gpuMath.step("centerTexture", ["u_lastPosition"], "u_position");
        gpuMath.step("copyTexture", ["u_position"], "u_lastLastPosition");
        gpuMath.swapTextures("u_position", "u_lastPosition");
        gpuMath.step("zeroTexture", [], "u_lastVelocity");
        gpuMath.step("zeroTexture", [], "u_velocity");
    }


    return {
        setFold: setFold,

        setFixedVertices: setFixedVertices,
        fixVertexAtIndex: fixVertexAtIndex,
        setExternalForce: setExternalForces,
        setForceAtIndex: setForceAtIndex,

        setAxialStiffness: setAxialStiffness,
        setFacetStiffness: setFacetStiffness,
        setCreaseStiffness: setCreaseStiffness,
        setDamping: setDamping,

        setCreasePercent: setCreasePercent,

        stepForward: stepForward,
        reset: reset,

        //todo get rid of these
        getNodes: getNodes,

        updateModel3DGeometry: updateModel3DGeometry,
        reCenter: reCenter
    }
}