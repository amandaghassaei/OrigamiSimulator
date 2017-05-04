/**
 * Created by ghassaei on 10/7/16.
 */

function initDynamicSolver(globals){

    globals.gpuMath = initGPUMath();

    var nodes;
    var edges;
    var faces;
    var creases;

    var originalPosition;
    var position;
    var lastPosition;
    var velocity;
    var lastVelocity;
    var externalForces;
    var mass;
    var meta;//[beamsIndex, numBeams, creasesIndex, numCreases]
    var beamMeta;//[K, D, length, otherNodeIndex]

    var normals;
    var faceVertexIndices;//[a,b,c]
    var creaseMeta;//[k, d, targetTheta]
    var creaseMeta2;//[creaseIndex (thetaIndex), length to node, nodeIndex (1/2), ]
                    //[creaseIndex (thetaIndex), length to node1, length to node2, -1]
    var creaseVectors;//indices of crease nodes
    var theta;//[theta, w, normalIndex1, normalIndex2]
    var lastTheta;//[theta, w, normalIndex1, normalIndex2]

    function syncNodesAndEdges(){
        nodes = globals.model.getNodes();
        edges = globals.model.getEdges();
        faces = globals.model.getFaces();
        creases = globals.model.getCreases();

        initTypedArrays();
        initTexturesAndPrograms(globals.gpuMath);
        steps = parseInt(setSolveParams());
    }

    var steps;
    var programsInited = false;//flag for initial setup

    var textureDim = 0;
    var textureDimEdges = 0;
    var textureDimFaces = 0;
    var textureDimCreases = 0;
    var textureDimNodeCreases = 0;

    function reset(){
        globals.gpuMath.step("zeroTexture", [], "u_position");
        globals.gpuMath.step("zeroTexture", [], "u_lastPosition");
        globals.gpuMath.step("zeroTexture", [], "u_velocity");
        globals.gpuMath.step("zeroTexture", [], "u_lastVelocity");
        //todo zero thetas
        // for (var i=0;i<creases.length;i++){
        //     lastTheta[i*4] = 0;
        //     lastTheta[i*4+1] = 0;
        // }
    }

    function solve(){
        if (globals.shouldSyncWithModel){
            syncNodesAndEdges();
            // reset();
            globals.shouldSyncWithModel = false;
        } else {
            if (globals.forceHasChanged) {
                updateExternalForces();
                globals.forceHasChanged = false;
            }
            if (globals.fixedHasChanged) {
                updateFixed();
                globals.fixedHasChanged = false;
            }
            if (globals.nodePositionHasChanged) {
                updateLastPosition();
                globals.nodePositionHasChanged = false;
            }
            if (globals.creaseMaterialHasChanged) {
                updateCreasesMeta();
                globals.creaseMaterialHasChanged = false;
            }
            if (globals.materialHasChanged) {
                updateMaterials();
                globals.materialHasChanged = false;
            }
            if (globals.shouldResetDynamicSim) {
                reset();
                globals.shouldResetDynamicSim = false;
            }
            if (globals.shouldChangeCreasePercent) {
                setCreasePercent(globals.creasePercent);
                globals.shouldChangeCreasePercent = false;
            }
        }

        for (var j=0;j<steps;j++){
            solveStep();
        }
        render();
    }

    function solveStep(){

        var gpuMath = globals.gpuMath;

        gpuMath.setProgram("normalCalc");
        gpuMath.setSize(textureDimFaces, textureDimFaces);
        gpuMath.step("normalCalc", ["u_faceVertexIndices", "u_lastPosition", "u_originalPosition"], "u_normals");

        gpuMath.setProgram("thetaCalc");
        gpuMath.setSize(textureDimCreases, textureDimCreases);
        gpuMath.step("thetaCalc", ["u_normals", "u_lastTheta", "u_creaseVectors", "u_lastPosition",
            "u_originalPosition"], "u_theta");

        gpuMath.setProgram("velocityCalc");
        gpuMath.setSize(textureDim, textureDim);
        gpuMath.step("velocityCalc", ["u_lastPosition", "u_lastVelocity", "u_originalPosition", "u_externalForces",
            "u_mass", "u_meta", "u_beamMeta", "u_creaseMeta", "u_creaseMeta2", "u_normals", "u_theta"], "u_velocity");
        gpuMath.step("positionCalc", ["u_velocity", "u_lastPosition", "u_mass"], "u_position");

        gpuMath.swapTextures("u_theta", "u_lastTheta");
        gpuMath.swapTextures("u_velocity", "u_lastVelocity");
        gpuMath.swapTextures("u_position", "u_lastPosition");
    }

    var $errorOutput = $("#globalError");

    function render(){

        // var vectorLength = 2;
        // globals.gpuMath.setProgram("packToBytes");
        // globals.gpuMath.setUniformForProgram("packToBytes", "u_vectorLength", vectorLength, "1f");
        // globals.gpuMath.setUniformForProgram("packToBytes", "u_floatTextureDim", [textureDimCreases, textureDimCreases], "2f");
        // globals.gpuMath.setSize(textureDimCreases*vectorLength, textureDimCreases);
        // globals.gpuMath.step("packToBytes", ["u_lastTheta"], "outputBytes");
        //
        // if (globals.gpuMath.readyToRead()) {
        //     var numPixels = nodes.length*vectorLength;
        //     var height = Math.ceil(numPixels/(textureDimCreases*vectorLength));
        //     var pixels = new Uint8Array(height*textureDimCreases*4*vectorLength);
        //     globals.gpuMath.readPixels(0, 0, textureDimCreases * vectorLength, height, pixels);
        //     var parsedPixels = new Float32Array(pixels.buffer);
        //     console.log(parsedPixels);
        // } else {
        //     console.log("here");
        // }

        var vectorLength = 4;
        globals.gpuMath.setProgram("packToBytes");
        globals.gpuMath.setUniformForProgram("packToBytes", "u_vectorLength", vectorLength, "1f");
        globals.gpuMath.setUniformForProgram("packToBytes", "u_floatTextureDim", [textureDim, textureDim], "2f");
        globals.gpuMath.setSize(textureDim*vectorLength, textureDim);
        globals.gpuMath.step("packToBytes", ["u_lastPosition"], "outputBytes");

        if (globals.gpuMath.readyToRead()) {
            var numPixels = nodes.length*vectorLength;
            var height = Math.ceil(numPixels/(textureDim*vectorLength));
            var pixels = new Uint8Array(height*textureDim*4*vectorLength);
            globals.gpuMath.readPixels(0, 0, textureDim * vectorLength, height, pixels);
            var parsedPixels = new Float32Array(pixels.buffer);
            var positions = globals.model.getPositionsArray();
            var globalError = 0;
            var colors;
            if (globals.colorMode == "axialStrain"){
                colors = globals.model.getColorsArray();
            }
            for (var i = 0; i < nodes.length; i++) {
                var rgbaIndex = i * vectorLength;
                var nodeError = parsedPixels[rgbaIndex+3];
                globalError += nodeError;
                var nodePosition = new THREE.Vector3(parsedPixels[rgbaIndex], parsedPixels[rgbaIndex + 1], parsedPixels[rgbaIndex + 2]);
                var nexPos = nodes[i].render(nodePosition);
                positions[3*i] = nexPos.x;
                positions[3*i+1] = nexPos.y;
                positions[3*i+2] = nexPos.z;
                if (colors){
                    var scaledVal = (1-nodeError/globals.errorClip) * 0.7;
                    var color = new THREE.Color();
                    color.setHSL(scaledVal, 1, 0.5);
                    colors[3*i] = color.r;
                    colors[3*i+1] = color.g;
                    colors[3*i+2] = color.b;
                }
            }
            $errorOutput.html((globalError/nodes.length*100).toFixed(7) + " %");
            for (var i=0;i<edges.length;i++){
                edges[i].render();
            }
        } else {
            console.log("here");
        }
    }

    function setSolveParams(){
        var dt = calcDt()/10;//todo factor of ten?
        var numSteps = 0.5/dt;
        globals.gpuMath.setProgram("thetaCalc");
        globals.gpuMath.setUniformForProgram("thetaCalc", "u_dt", dt, "1f");
        globals.gpuMath.setProgram("velocityCalc");
        globals.gpuMath.setUniformForProgram("velocityCalc", "u_dt", dt, "1f");
        globals.gpuMath.setProgram("positionCalc");
        globals.gpuMath.setUniformForProgram("positionCalc", "u_dt", dt, "1f");
        globals.controls.setDeltaT(dt);
        return numSteps;
    }

    function calcDt(){
        var maxFreqNat = 0;
        _.each(edges, function(beam){
            if (beam.getNaturalFrequency()>maxFreqNat) maxFreqNat = beam.getNaturalFrequency();
        });
        return (1/(2*Math.PI*maxFreqNat))*0.9;//0.9 of max delta t for good measure
    }

    function initTexturesAndPrograms(gpuMath){

        var vertexShader = document.getElementById("vertexShader").text;

        gpuMath.initTextureFromData("u_position", textureDim, textureDim, "FLOAT", position, true);
        gpuMath.initTextureFromData("u_lastPosition", textureDim, textureDim, "FLOAT", lastPosition, true);
        gpuMath.initTextureFromData("u_velocity", textureDim, textureDim, "FLOAT", velocity, true);
        gpuMath.initTextureFromData("u_lastVelocity", textureDim, textureDim, "FLOAT", lastVelocity, true);
        gpuMath.initTextureFromData("u_theta", textureDimCreases, textureDimCreases, "FLOAT", theta, true);
        gpuMath.initTextureFromData("u_lastTheta", textureDimCreases, textureDimCreases, "FLOAT", lastTheta, true);
        gpuMath.initTextureFromData("u_normals", textureDimFaces, textureDimFaces, "FLOAT", normals, true);

        gpuMath.initFrameBufferForTexture("u_position", true);
        gpuMath.initFrameBufferForTexture("u_lastPosition", true);
        gpuMath.initFrameBufferForTexture("u_velocity", true);
        gpuMath.initFrameBufferForTexture("u_lastVelocity", true);
        gpuMath.initFrameBufferForTexture("u_theta", true);
        gpuMath.initFrameBufferForTexture("u_lastTheta", true);
        gpuMath.initFrameBufferForTexture("u_normals", true);

        gpuMath.initTextureFromData("u_meta", textureDim, textureDim, "FLOAT", meta, true);
        gpuMath.initTextureFromData("u_creaseMeta2", textureDimNodeCreases, textureDimNodeCreases, "FLOAT", creaseMeta2, true);
        gpuMath.initTextureFromData("u_faceVertexIndices", textureDimFaces, textureDimFaces, "FLOAT", faceVertexIndices, true);

        gpuMath.createProgram("positionCalc", vertexShader, document.getElementById("positionCalcShader").text);
        gpuMath.setUniformForProgram("positionCalc", "u_velocity", 0, "1i");
        gpuMath.setUniformForProgram("positionCalc", "u_lastPosition", 1, "1i");
        gpuMath.setUniformForProgram("positionCalc", "u_mass", 2, "1i");
        gpuMath.setUniformForProgram("positionCalc", "u_textureDim", [textureDim, textureDim], "2f");

        gpuMath.createProgram("velocityCalc", vertexShader, document.getElementById("velocityCalcShader").text);
        gpuMath.setUniformForProgram("velocityCalc", "u_lastPosition", 0, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_lastVelocity", 1, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_originalPosition", 2, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_externalForces", 3, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_mass", 4, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_meta", 5, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_beamMeta", 6, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_creaseMeta", 7, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_creaseMeta2", 8, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_normals", 9, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_theta", 10, "1i");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDim", [textureDim, textureDim], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimEdges", [textureDimEdges, textureDimEdges], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimFaces", [textureDimFaces, textureDimFaces], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimCreases", [textureDimCreases, textureDimCreases], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimNodeCreases", [textureDimNodeCreases, textureDimNodeCreases], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_creasePercent", globals.creasePercent, "1f");

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
        for (var i=0;i<nodes.length;i++){
            if (initing) {
                meta[4*i] = index;
                meta[4*i+1] = nodes[i].numBeams();
            }
            for (var j=0;j<nodes[i].beams.length;j++){
                var beam = nodes[i].beams[j];
                beamMeta[4*index] = beam.getK();
                beamMeta[4*index+1] = beam.getD();
                if (initing) {
                    beamMeta[4*index+2] = beam.getLength();
                    beamMeta[4*index+3] = beam.getOtherNode(nodes[i]).getIndex();
                }
                index+=1;
            }
        }
        globals.gpuMath.initTextureFromData("u_beamMeta", textureDimEdges, textureDimEdges, "FLOAT", beamMeta, true);
        //recalc dt
        if (programsInited) setSolveParams();
    }

    function updateExternalForces(){
        for (var i=0;i<nodes.length;i++){
            var externalForce = nodes[i].getExternalForce();
            externalForces[4*i] = externalForce.x;
            externalForces[4*i+1] = externalForce.y;
            externalForces[4*i+2] = externalForce.z;
        }
        globals.gpuMath.initTextureFromData("u_externalForces", textureDim, textureDim, "FLOAT", externalForces, true);
    }

    function updateFixed(){
        for (var i=0;i<nodes.length;i++){
            mass[4*i+1] = (nodes[i].isFixed() ? 1 : 0);
        }
        globals.gpuMath.initTextureFromData("u_mass", textureDim, textureDim, "FLOAT", mass, true);
    }

    function updateOriginalPosition(){
        for (var i=0;i<nodes.length;i++){
            var origPosition = nodes[i].getOriginalPosition();
            originalPosition[4*i] = origPosition.x;
            originalPosition[4*i+1] = origPosition.y;
            originalPosition[4*i+2] = origPosition.z;
        }
        globals.gpuMath.initTextureFromData("u_originalPosition", textureDim, textureDim, "FLOAT", originalPosition, true);
    }

    function updateCreaseVectors(){
        for (var i=0;i<creases.length;i++){
            var rgbaIndex = i*4;
            var nodes = creases[i].edge.nodes;
            // this.vertices[1].clone().sub(this.vertices[0]);
            creaseVectors[rgbaIndex] = nodes[0].getIndex();
            creaseVectors[rgbaIndex+1] = nodes[1].getIndex();
        }
        globals.gpuMath.initTextureFromData("u_creaseVectors", textureDimCreases, textureDimCreases, "FLOAT", creaseVectors, true);
    }

    function updateCreasesMeta(initing){
        for (var i=0;i<creases.length;i++){
            var crease = creases[i];
            creaseMeta[i*4] = crease.getK();
            creaseMeta[i*4+1] = crease.getD();
            if (initing) creaseMeta[i*4+2] = crease.getTargetTheta();
        }
        globals.gpuMath.initTextureFromData("u_creaseMeta", textureDimCreases, textureDimCreases, "FLOAT", creaseMeta, true);
    }

    function updateLastPosition(){
        for (var i=0;i<nodes.length;i++){
            var _position = nodes[i].getRelativePosition();
            lastPosition[4*i] = _position.x;
            lastPosition[4*i+1] = _position.y;
            lastPosition[4*i+2] = _position.z;
        }
        globals.gpuMath.initTextureFromData("u_lastPosition", textureDim, textureDim, "FLOAT", lastPosition, true);
        globals.gpuMath.initFrameBufferForTexture("u_lastPosition", true);
    }

    function setCreasePercent(percent){
        if (!programsInited) return;
        globals.gpuMath.setProgram("velocityCalc");
        globals.gpuMath.setUniformForProgram("velocityCalc", "u_creasePercent", percent, "1f");
    }

    function initTypedArrays(){

        textureDim = calcTextureSize(nodes.length);

        var numEdges = 0;
        for (var i=0;i<nodes.length;i++){
            numEdges += nodes[i].numBeams();
        }
        textureDimEdges = calcTextureSize(numEdges);

        var numCreases = creases.length;
        textureDimCreases = calcTextureSize(numCreases);

        var numNodeCreases = 0;
        for (var i=0;i<nodes.length;i++){
            numNodeCreases += nodes[i].numCreases();
        }
        numNodeCreases += numCreases*2;
        textureDimNodeCreases = calcTextureSize(numNodeCreases);

        var numFaces = faces.length;
        textureDimFaces = calcTextureSize(numFaces);

        originalPosition = new Float32Array(textureDim*textureDim*4);
        position = new Float32Array(textureDim*textureDim*4);
        lastPosition = new Float32Array(textureDim*textureDim*4);
        velocity = new Float32Array(textureDim*textureDim*4);
        lastVelocity = new Float32Array(textureDim*textureDim*4);
        externalForces = new Float32Array(textureDim*textureDim*4);
        mass = new Float32Array(textureDim*textureDim*4);
        meta = new Float32Array(textureDim*textureDim*4);
        beamMeta = new Float32Array(textureDimEdges*textureDimEdges*4);

        normals = new Float32Array(textureDimFaces*textureDimFaces*4);
        faceVertexIndices = new Float32Array(textureDimFaces*textureDimFaces*4);
        creaseMeta = new Float32Array(textureDimCreases*textureDimCreases*4);
        creaseMeta2 = new Float32Array(textureDimNodeCreases*textureDimNodeCreases*4);
        creaseVectors = new Float32Array(textureDimCreases*textureDimCreases*4);
        theta = new Float32Array(textureDimCreases*textureDimCreases*4);
        lastTheta = new Float32Array(textureDimCreases*textureDimCreases*4);

        for (var i=0;i<faces.length;i++){
            var face = faces[i];
            faceVertexIndices[4*i] = face.a;
            faceVertexIndices[4*i+1] = face.b;
            faceVertexIndices[4*i+2] = face.c;
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
        for (var i=0;i<nodes.length;i++){
            mass[4*i] = nodes[i].getSimMass();
            meta[i*4+2] = index;
            var nodeCreases = nodes[i].creases;
            var nodeInvCreases = nodes[i].invCreases;
            // console.log(nodeInvCreases);
            meta[i*4+3] = nodeCreases.length + nodeInvCreases.length;
            for (var j=0;j<nodeCreases.length;j++){
                creaseMeta2[index*4] = nodeCreases[j].getIndex();
                creaseMeta2[index*4+1] = nodeCreases[j].getLengthTo(nodes[i]);
                creaseMeta2[index*4+2] = nodeCreases[j].getNodeIndex(nodes[i]);//type 1 or 2
                index++;
            }
            for (var j=0;j<nodeInvCreases.length;j++){
                creaseMeta2[index*4] = nodeInvCreases[j].getIndex();
                creaseMeta2[index*4+1] = nodeInvCreases[j].getLengthToNode1();
                creaseMeta2[index*4+2] = nodeInvCreases[j].getLengthToNode2();
                creaseMeta2[index*4+3] = -1;
                index++;
            }
        }

        updateOriginalPosition();
        updateMaterials(true);
        updateFixed();
        updateExternalForces();
        updateCreasesMeta(true);
        updateCreaseVectors();
        setCreasePercent(globals.creasePercent);
    }

    return {
        syncNodesAndEdges: syncNodesAndEdges,
        updateFixed: updateFixed,
        solve: solve
    }
}