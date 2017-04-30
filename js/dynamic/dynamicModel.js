/**
 * Created by ghassaei on 10/7/16.
 */

function initDynamicModel(globals){

    var material = new THREE.MeshNormalMaterial({shading: THREE.FlatShading, side: THREE.DoubleSide});
    var geometry = new THREE.Geometry();
    geometry.dynamic = true;
    var object3D = new THREE.Mesh(geometry, material);
    object3D.visible = globals.dynamicSimVisible;
    globals.threeView.sceneAdd(object3D);

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
    var creaseMeta;//[k, d, targetTheta]
    var creaseMeta2;//[creaseIndex (thetaIndex), length to node, nodeIndex (1/2), ]
                    //[creaseIndex (thetaIndex), length to node1, length to node2, -1]
    var creaseVectors;//vectors of oriented edges in crease
    var theta;//[theta, w, normalIndex1, normalIndex2]
    var lastTheta;//[theta, w, normalIndex1, normalIndex2]

    function syncNodesAndEdges(firstTime){
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


        initTypedArrays();
        if (firstTime === undefined) firstTime = false;
        initTexturesAndPrograms(globals.gpuMath, firstTime);
        steps = parseInt(setSolveParams());

        if(firstTime) runSolver();
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

    function runSolver(){
        globals.threeView.startAnimation(function(){
            if (!globals.dynamicSimVisible) {
                return;
            }
            for (var j=0;j<steps;j++){
                solveStep();
            }
            render();
        });
    }

    function setVisibility(state){
        object3D.visible = state;
        globals.threeView.render();
    }

    function solveStep(){

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
            if (globals.shouldResetDynamicSim) {
                reset();
                globals.shouldResetDynamicSim = false;
            }
            if (globals.shouldChangeCreasePercent) {
                setCreasePercent(globals.creasePercent);
                globals.shouldChangeCreasePercent = false;
            }
        }

        var gpuMath = globals.gpuMath;

        gpuMath.setProgram("thetaCalc");
        gpuMath.setSize(textureDimCreases, textureDimCreases);
        gpuMath.step("thetaCalc", ["u_normals", "u_lastTheta", "u_creaseVectors"], "u_theta");

        gpuMath.setProgram("velocityCalc");
        gpuMath.setSize(textureDim, textureDim);
        gpuMath.step("velocityCalc", ["u_lastPosition", "u_lastVelocity", "u_originalPosition", "u_externalForces",
            "u_mass", "u_meta", "u_beamMeta", "u_creaseMeta", "u_creaseMeta2", "u_normals", "u_theta"], "u_velocity");
        gpuMath.step("positionCalc", ["u_velocity", "u_lastPosition", "u_mass"], "u_position");

        gpuMath.swapTextures("u_theta", "u_lastTheta");
        gpuMath.swapTextures("u_velocity", "u_lastVelocity");
        gpuMath.swapTextures("u_position", "u_lastPosition");
    }

    function render(){

        // var vectorLength = 1;
        // globals.gpuMath.setProgram("packToBytes");
        // globals.gpuMath.setUniformForProgram("packToBytes", "u_vectorLength", vectorLength, "1f");
        // globals.gpuMath.setSize(textureDim*vectorLength, textureDim);
        // globals.gpuMath.step("packToBytes", ["u_theta"], "outputBytes");
        // if (globals.gpuMath.readyToRead()) {
        //     var numPixels = creases.length*vectorLength;
        //     var height = Math.ceil(numPixels/(textureDimCreases*vectorLength));
        //     var pixels = new Uint8Array(height*textureDimCreases*4*vectorLength);
        //     globals.gpuMath.readPixels(0, 0, textureDimCreases * vectorLength, height, pixels);
        //     var parsedPixels = new Float32Array(pixels.buffer);
        //     for (var i = 0; i < 1; i++) {
        //         console.log(parsedPixels[i])
        //     }
        // } else {
        //     console.log("here");
        // }

        var vectorLength = 3;
        globals.gpuMath.setProgram("packToBytes");
        globals.gpuMath.setUniformForProgram("packToBytes", "u_vectorLength", vectorLength, "1f");
        globals.gpuMath.setSize(textureDim*vectorLength, textureDim);
        globals.gpuMath.step("packToBytes", ["u_lastPosition"], "outputBytes");

        if (globals.gpuMath.readyToRead()) {
            var numPixels = nodes.length*vectorLength;
            var height = Math.ceil(numPixels/(textureDim*vectorLength));
            var pixels = new Uint8Array(height*textureDim*4*vectorLength);
            globals.gpuMath.readPixels(0, 0, textureDim * vectorLength, height, pixels);
            var parsedPixels = new Float32Array(pixels.buffer);
            for (var i = 0; i < nodes.length; i++) {
                var rgbaIndex = i * vectorLength;
                var nodePosition = new THREE.Vector3(parsedPixels[rgbaIndex], parsedPixels[rgbaIndex + 1], parsedPixels[rgbaIndex + 2]);
                nodes[i].render(nodePosition);
            }
            for (var i=0;i<edges.length;i++){
                edges[i].render();
            }
            geometry.verticesNeedUpdate = true;
            geometry.computeFaceNormals();
            updateNormals();
        } else {
            console.log("here");
        }

        //globals.gpuMath.setSize(textureDim, textureDim);
    }

    function setSolveParams(){
        var dt = calcDt()/10;//todo this is weird
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

    function initTexturesAndPrograms(gpuMath, firstTime){

        var vertexShader = document.getElementById("vertexShader").text;

        gpuMath.initTextureFromData("u_position", textureDim, textureDim, "FLOAT", position, !firstTime);
        gpuMath.initTextureFromData("u_lastPosition", textureDim, textureDim, "FLOAT", lastPosition, !firstTime);
        gpuMath.initTextureFromData("u_velocity", textureDim, textureDim, "FLOAT", velocity, !firstTime);
        gpuMath.initTextureFromData("u_lastVelocity", textureDim, textureDim, "FLOAT", lastVelocity, !firstTime);
        gpuMath.initTextureFromData("u_theta", textureDimCreases, textureDimCreases, "FLOAT", theta, !firstTime);
        gpuMath.initTextureFromData("u_lastTheta", textureDimCreases, textureDimCreases, "FLOAT", lastTheta, !firstTime);

        gpuMath.initFrameBufferForTexture("u_position", !firstTime);
        gpuMath.initFrameBufferForTexture("u_lastPosition", !firstTime);
        gpuMath.initFrameBufferForTexture("u_velocity", !firstTime);
        gpuMath.initFrameBufferForTexture("u_lastVelocity", !firstTime);
        gpuMath.initFrameBufferForTexture("u_theta", !firstTime);
        gpuMath.initFrameBufferForTexture("u_lastTheta", !firstTime);

        gpuMath.initTextureFromData("u_meta", textureDim, textureDim, "FLOAT", meta, true);
        gpuMath.initTextureFromData("u_creaseMeta2", textureDimNodeCreases, textureDimNodeCreases, "FLOAT", creaseMeta2, true);

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
        gpuMath.setUniformForProgram("thetaCalc", "u_textureDimFaces", [textureDimFaces, textureDimFaces], "2f");
        gpuMath.setUniformForProgram("thetaCalc", "u_textureDimCreases", [textureDimCreases, textureDimCreases], "2f");

        gpuMath.createProgram("packToBytes", vertexShader, document.getElementById("packToBytesShader").text);
        gpuMath.initTextureFromData("outputBytes", textureDim*4, textureDim, "UNSIGNED_BYTE", null, !firstTime);
        gpuMath.initFrameBufferForTexture("outputBytes", !firstTime);
        gpuMath.setUniformForProgram("packToBytes", "u_floatTextureDim", [textureDim, textureDim], "2f");

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

    function updateNormals(){
        var numFaces = geometry.faces.length;
        for (var i=0;i<numFaces;i++){
            var normal = geometry.faces[i].normal;
            normals[i*4] = normal.x;
            normals[i*4+1] = normal.y;
            normals[i*4+2] = normal.z;
        }
        globals.gpuMath.initTextureFromData("u_normals", textureDimFaces, textureDimFaces, "FLOAT", normals, true);
    }

    function updateCreaseVectors(){
        for (var i=0;i<creases.length;i++){
            var rgbaIndex = i*4;
            var vector = creases[i].getVector();
            creaseVectors[rgbaIndex] = -vector.x;
            creaseVectors[rgbaIndex+1] = -vector.y;
            creaseVectors[rgbaIndex+2] = -vector.z;
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

        var numFaces = geometry.faces.length;
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
        creaseMeta = new Float32Array(textureDimCreases*textureDimCreases*4);
        creaseMeta2 = new Float32Array(textureDimNodeCreases*textureDimNodeCreases*4);
        creaseVectors = new Float32Array(textureDimCreases*textureDimCreases*4);
        theta = new Float32Array(textureDimCreases*textureDimCreases*4);
        lastTheta = new Float32Array(textureDimCreases*textureDimCreases*4);

        for (var i=0;i<textureDim*textureDim;i++){
            mass[4*i+1] = 1;//set all fixed by default
        }

        _.each(nodes, function(node, index){
            mass[4*index] = node.getSimMass();
        });

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
        updateNormals();
    }

    function pause(){
        globals.threeView.pauseAnimation();
    }

    function resume(){
        runSolver();
    }

    return {
        syncNodesAndEdges: syncNodesAndEdges,
        pause: pause,
        resume: resume,
        setVisibility: setVisibility,
        updateFixed: updateFixed
    }
}