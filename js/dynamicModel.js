/**
 * Created by ghassaei on 10/7/16.
 */

function initDynamicModel(globals){

    var object3D = new THREE.Object3D();
    object3D.visible = globals.dynamicSimVisible;
    globals.threeView.sceneAddModel(object3D);

    var nodes;
    var edges;

    var originalPosition;
    var position;
    var lastPosition;
    var velocity;
    var lastVelocity;
    var externalForces;
    var mass;
    var meta;//[beamsIndex, numBeams]
    var beamMeta;//[K, D, length, otherNodeIndex]

    function syncNodesAndEdges(){
        nodes = globals.model.getNodes();
        edges = globals.model.getEdges();
        //update mesh nodes

        initTypedArrays();
    }

    var steps;
    var programsInited = false;//flag for initial setup

    var textureDim = 0;
    var textureDimEdges = 0;
    syncNodesAndEdges();
    initTexturesAndPrograms(globals.gpuMath);
    steps = parseInt(setSolveParams());
    runSolver();

    function reset(){
        globals.gpuMath.step("zeroTexture", [], "u_position");
        globals.gpuMath.step("zeroTexture", [], "u_lastPosition");
        globals.gpuMath.step("zeroTexture", [], "u_velocity");
        globals.gpuMath.step("zeroTexture", [], "u_lastVelocity");
    }

    function runSolver(){
        globals.threeView.startAnimation(function(){
            if (!globals.dynamicSimVisible) {
                if (globals.selfWeightMode == "dynamic"){
                    globals.staticModel.setSelfWeight();
                }
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
    }

    function setSelfWeight(){
        // console.log(nodes[0].getSelfWeight().length());
        for (var i=0;i<nodes.length;i++){
            var node = nodes[i];
            if (globals.applySelfWeight) globals.schematic.forces[i].setSelfWeight(node.getSelfWeight());
            else globals.schematic.forces[i].setSelfWeight(new THREE.Vector3(0,0,0));
        }
        globals.forceArrayUpdated();
    }

    function solveStep(){

        if (globals.forceHasChanged){
            updateExternalForces();
            globals.forceHasChanged = false;
        }
        if (globals.fixedHasChanged){
            updateFixed();
            globals.fixedHasChanged = false;
        }
        if (globals.dynamicSimMaterialsChanged){
            updateMaterials();
            globals.dynamicSimMaterialsChanged = false;
        }
        if (globals.shouldResetDynamicSim){
            reset();
            globals.shouldResetDynamicSim = false;
        }

        var gpuMath = globals.gpuMath;

        gpuMath.step("velocityCalc", ["u_lastPosition", "u_lastVelocity", "u_originalPosition", "u_externalForces",
            "u_mass", "u_meta", "u_beamMeta"], "u_velocity");
        gpuMath.step("positionCalc", ["u_velocity", "u_lastPosition", "u_mass"], "u_position");

        gpuMath.swapTextures("u_velocity", "u_lastVelocity");
        gpuMath.swapTextures("u_position", "u_lastPosition");
    }

    function render(){

        var vectorLength = 3;
        globals.gpuMath.setProgram("packToBytes");
        globals.gpuMath.setUniformForProgram("packToBytes", "u_vectorLength", vectorLength, "1f");
        globals.gpuMath.setSize(textureDim*vectorLength, textureDim);
        globals.gpuMath.step("packToBytes", ["u_lastPosition"], "outputBytes");

        var pixels = new Uint8Array(textureDim*textureDim*4*vectorLength);
        if (globals.gpuMath.readyToRead()) {
            var numPixels = nodes.length*vectorLength;
            var height = Math.ceil(numPixels/(textureDim*vectorLength));
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
        } else {
            console.log("here");
        }

        globals.threeView.render();
        globals.gpuMath.setSize(textureDim, textureDim);
    }

    function setViewMode(mode){
        if (mode == "material"){
            _.each(edges, function(edge){
                edge.setMaterialColor();
            })
        }
    }

    function setSolveParams(){
        var dt = calcDt();
        var numSteps = 0.5/dt;
        globals.gpuMath.setProgram("velocityCalc");
        globals.gpuMath.setUniformForProgram("velocityCalc", "u_dt", dt, "1f");
        globals.gpuMath.setProgram("positionCalc");
        globals.gpuMath.setUniformForProgram("positionCalc", "u_dt", dt, "1f");
        return numSteps;
    }

    function calcDt(){
        var maxFreqNat = 0;
        _.each(edges, function(beam){
            if (beam.getNaturalFrequency()>maxFreqNat) maxFreqNat = beam.getNaturalFrequency();
        });
        return (1/(2*Math.PI*maxFreqNat))*0.5;//half of max delta t for good measure
    }

    function updateTextures(gpuMath){
        gpuMath.initTextureFromData("u_originalPosition", textureDim, textureDim, "FLOAT", originalPosition, true);
        gpuMath.initTextureFromData("u_meta", textureDim, textureDim, "FLOAT", meta, true);
        reset();
    }

    function initTexturesAndPrograms(gpuMath){

        var vertexShader = document.getElementById("vertexShader").text;

        gpuMath.initTextureFromData("u_position", textureDim, textureDim, "FLOAT", position);
        gpuMath.initFrameBufferForTexture("u_position");
        gpuMath.initTextureFromData("u_lastPosition", textureDim, textureDim, "FLOAT", lastPosition);
        gpuMath.initFrameBufferForTexture("u_lastPosition");
        gpuMath.initTextureFromData("u_velocity", textureDim, textureDim, "FLOAT", velocity);
        gpuMath.initFrameBufferForTexture("u_velocity");
        gpuMath.initTextureFromData("u_lastVelocity", textureDim, textureDim, "FLOAT", lastVelocity);
        gpuMath.initFrameBufferForTexture("u_lastVelocity");

        gpuMath.initTextureFromData("u_originalPosition", textureDim, textureDim, "FLOAT", originalPosition);
        gpuMath.initTextureFromData("u_meta", textureDim, textureDim, "FLOAT", meta);

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
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDim", [textureDim, textureDim], "2f");
        gpuMath.setUniformForProgram("velocityCalc", "u_textureDimEdges", [textureDimEdges, textureDimEdges], "2f");

        gpuMath.createProgram("packToBytes", vertexShader, document.getElementById("packToBytesShader").text);
        gpuMath.initTextureFromData("outputBytes", textureDim*4, textureDim, "UNSIGNED_BYTE", null);
        gpuMath.initFrameBufferForTexture("outputBytes");
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
        console.warn("no texture size found for " + numCells + " cells");
        return 0;
    }

    function updateMaterials(){
        var index = 0;
        for (var i=0;i<nodes.length;i++){
            meta[4*i] = index;
            meta[4*i+1] = nodes[i].numBeams();
            for (var j=0;j<nodes[i].beams.length;j++){
                var beam = nodes[i].beams[j];
                beamMeta[4*index] = beam.getK();
                beamMeta[4*index+1] = beam.getD();
                beamMeta[4*index+2] = beam.getLength();
                beamMeta[4*index+3] = beam.getOtherNode(nodes[i]).getIndex();
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

    function initTypedArrays(){

        textureDim = calcTextureSize(nodes.length);

        var numEdges = 0;
        for (var i=0;i<nodes.length;i++){
            numEdges += nodes[i].numBeams();
        }
        textureDimEdges = calcTextureSize(numEdges);

        originalPosition = new Float32Array(textureDim*textureDim*4);
        position = new Float32Array(textureDim*textureDim*4);
        lastPosition = new Float32Array(textureDim*textureDim*4);
        velocity = new Float32Array(textureDim*textureDim*4);
        lastVelocity = new Float32Array(textureDim*textureDim*4);
        externalForces = new Float32Array(textureDim*textureDim*4);
        mass = new Float32Array(textureDim*textureDim*4);
        meta = new Float32Array(textureDim*textureDim*4);//todo uint16
        beamMeta = new Float32Array(textureDimEdges*textureDimEdges*4);

        for (var i=0;i<textureDim*textureDim;i++){
            mass[4*i+1] = 1;//set all fixed by default
        }

        _.each(nodes, function(node, index){
            mass[4*index] = node.getSimMass();
        });

        updateOriginalPosition();
        updateMaterials();
        updateFixed();
        updateExternalForces();
    }

    function getChildren(){
        return object3D.children;
    }

    return {
        setVisibility: setVisibility,
        getChildren: getChildren,
        setViewMode: setViewMode,
        syncNodesAndEdges: syncNodesAndEdges,
        updateOriginalPosition: updateOriginalPosition
    }
}