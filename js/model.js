/**
 * Created by amandaghassaei on 2/24/17.
 */

//model updates object3d geometry and materials

function initModel(globals){

    var material, material2, geometry;
    var frontside = new THREE.Mesh();//front face of mesh
    var backside = new THREE.Mesh();//back face of mesh (different color)
    backside.visible = false;

    var lineMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1});
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

    clearGeometries();
    setMeshMaterial();

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

    globals.threeView.sceneAddModel(frontside);
    globals.threeView.sceneAddModel(backside);
    _.each(lines, function(line){
        globals.threeView.sceneAddModel(line);
    });

    var positions;//place to store buffer geo vertex data
    var colors;//place to store buffer geo vertex colors
    var indices;
    var nodes = [];
    var faces = [];
    var edges = [];
    var creases = [];
    var vertices = [];//indexed vertices array
    var fold, creaseParams;

    var nextCreaseParams, nextFold;//todo only nextFold, nextCreases?

    var inited = false;

    function setMeshMaterial() {
        var polygonOffset = 0.5;
        if (globals.colorMode == "normal") {
            material = new THREE.MeshNormalMaterial({
                flatShading:true,
                side: THREE.DoubleSide,
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
            material.color.setStyle( "#" + globals.color1);
            material2.color.setStyle( "#" + globals.color2);
            backside.visible = true;
        }
        frontside.material = material;
        backside.material = material2;
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

    let masks = [];

    function stepFinderInit(i) {
        console.log(`Initializing mask ${i + 1}`);
        if (i >= creases.length) return stepFinderLoop(0);
        if (Math.abs(creases[i].getTargetTheta()) < Math.PI / 100) { 
            return stepFinderInit(i + 1);
        }
        globals.mask = {
            vanishCrease: i,
            looseCreases: [],
            instabilities: null,
            totalInstability: null
        };
        globals.creaseMaterialHasChanged = true;
        return () => {
            globals.mask.instabilities = getInstabilities();
            globals.mask.totalInstability = globals.mask.instabilities.reduce((a, b) => a + b, 0);
            if (globals.mask.totalInstability < 1e-5) {
                console.log("Found step sequence with total instability < 1e-5");
                applyMask();
                globals.creaseMaterialHasChanged = true;
                return;
            }
            masks.push(globals.mask);
            return stepFinderInit(i + 1);
        }
    }

    function stepFinderLoop(i) {
        console.log(`Testing mask ${i + 1} of ${masks.length}`);
        if (masks.length == 0) return;
        if (i >= masks.length) return stepFinderLoop(0);
        globals.mask = masks[i];
        globals.creaseMaterialHasChanged = true;
        if (masks[i].looseCreases.length >= creases.length - 1) {
            globals.mask = null;
            console.log("All masks tested.");
            return;
        }
        let adjNodes = [];
        adjNodes.push(...creases[globals.mask.vanishCrease].edge.nodes);
        for (let j = 0; j < globals.mask.looseCreases.length; j++){
            let crease = creases[globals.mask.looseCreases[j]];
            console.log("Adj nodes from loose crease " + globals.mask.looseCreases[j]);
            adjNodes.push(...crease.edge.nodes);
        }
        console.log(adjNodes);
        let adjcreases = adjNodes.map(n => n.creases.concat(n.invCreases)).flat().map(c => c.index);
        let nextCreaseIndex = null;
        for (let j = 0; j < adjcreases.length; j++){
            if (globals.mask.looseCreases.includes(adjcreases[j])) continue;
            if (globals.mask.vanishCrease === adjcreases[j]) continue;
            nextCreaseIndex = adjcreases[j];
            console.log("Next adjacent crease to loosen: " + nextCreaseIndex);
            break;
        }
        if (nextCreaseIndex === null) {
            console.log("Warning: No adjacent creases found to loosen");
            globals.mask = null;
            return;
        }
        let maxInstability = -1;
        for (let j = 0; j < creases.length; j++){
            if (!adjcreases.includes(j)) continue;
            if (globals.mask.looseCreases.includes(j)) continue;
            if (globals.mask.vanishCrease === j) continue;
            if (Math.abs(creases[j].getTargetTheta()) < Math.PI / 100) continue;
            if (globals.mask.instabilities[j] > maxInstability){
                maxInstability = globals.mask.instabilities[j];
                nextCreaseIndex = j;
            }
        }
        console.log("Loosening crease " + nextCreaseIndex + " with instability " + maxInstability);
        globals.mask.looseCreases.push(nextCreaseIndex);
        return () => {
            globals.mask.instabilities = getInstabilities();
            globals.mask.totalInstability = globals.mask.instabilities.reduce((a, b) => a + b, 0);
            if (globals.mask.totalInstability < 1e-5) {
                console.log("Found step sequence with total instability < 1e-5");
                applyMask();
                globals.creaseMaterialHasChanged = true;
                return;
            }
            return stepFinderLoop(i + 1);
        };
    }

    function applyMask() {
        if (!globals.mask) return;
        console.log(`Applying mask: vanishing crease ${globals.mask.vanishCrease}:` +
            `${creases[globals.mask.vanishCrease].getTargetTheta()})`);
        creases[globals.mask.vanishCrease].targetTheta = 0;
        let actualThetas = getSolver().getTheta();
        for (let i = 0; i < globals.mask.looseCreases.length; i++){
            let idx = globals.mask.looseCreases[i];
            let actualTheta = actualThetas[idx];
            if (Math.abs(actualTheta) < Math.PI / 100) actualTheta = 0;
            if (Math.abs(actualTheta - Math.PI) < Math.PI / 100) actualTheta = Math.PI;
            if (Math.abs(actualTheta + Math.PI) < Math.PI / 100) actualTheta = -Math.PI;
            console.log(`  loosening crease ${idx}: ` +
                `${creases[idx].getTargetTheta()})` + 
                ` to ${actualTheta})`);
            creases[idx].targetTheta = actualTheta;
        }
        globals.mask = null;
    }

    function getInstabilities(){
        let actualThetas = getSolver().getTheta();
        let instabilities = [];
        for (let i = 0; i < creases.length; i++){
            let instability =
                creases[i].getK() *
                (actualThetas[i] - creases[i].getTargetTheta()) ** 2;
            instabilities.push(instability);
        }
        return instabilities;
    }

    let lastInstability = 0;
    let stepsSinceStable = 0;
    let callCount = 0;
    let stepper = null;

    function initStepper(){
        if (stepper) {
            console.log("Stepper already initialized.");
            return;
        }
        console.log("Initializing stepper...");
        masks = [];
        stepper = stepFinderInit(0);
    }

    function InstabilityTestLoop() {
        callCount = (callCount + 1) % 10;
        const instabilities = getInstabilities();
        const instability = instabilities.reduce((a, b) => a + b, 0);
        const same6 = instability.toFixed(6) === lastInstability.toFixed(6);
        const same4 = instability.toFixed(4) === lastInstability.toFixed(4);
        const stabilized = same6 || (stepsSinceStable === 0 && same4);
        const logInstability = () => {
            console.log(`Instability: ${instability.toFixed(5)} [${stepsSinceStable} steps]`);
        };
        if (stabilized) {
            if (stepsSinceStable !== 0) {
                logInstability();
                console.log("System has stabilized, stopping monitoring...");
            }
            if (stepper) {
                stepper = stepper();
            }
            stepsSinceStable = 0;
        } else {
            if (stepsSinceStable === 0) {
                console.log("Instability detected, starting monitoring...");
                logInstability();
            }
            if (callCount === 0) {
                logInstability();
            }
            stepsSinceStable++;
        }
        lastInstability = instability;
    }


    function step(numSteps) {
        getSolver().solve(numSteps);
        setGeoUpdates();
        InstabilityTestLoop();
    }

    function setGeoUpdates(){
        geometry.attributes.position.needsUpdate = true;
        if (globals.colorMode == "axialStrain") geometry.attributes.color.needsUpdate = true;
        if (globals.userInteractionEnabled || globals.vrEnabled) geometry.computeBoundingBox();
    }

    function startSolver(){
        globals.threeView.startAnimation();
    }

    function getSolver(){
        if (globals.simType == "dynamic") return globals.dynamicSolver;
        else if (globals.simType == "static") return globals.staticSolver;
        return globals.rigidSolver;
    }




    function buildModel(fold, creaseParams){
        if (globals.keyframeCount !== creaseParams[0][5][1].length) {
            globals.keyframeCount = creaseParams[0][5][1].length > 0 ? creaseParams[0][5][1].length : 2;
            globals.controls.updateCreasePercent();
        }

        if (fold.vertices_coords.length == 0) {
            globals.warn("No geometry found.");
            return;
        }
        if (fold.faces_vertices.length == 0) {
            globals.warn("No faces found, try adjusting import vertex merge tolerance.");
            return;
        }
        if (fold.edges_vertices.length == 0) {
            globals.warn("No edges found.");
            return;
        }

        nextFold = fold;
        nextCreaseParams = creaseParams;

        globals.needsSync = true;
        globals.simNeedsSync = true;

        if (!inited) {
            startSolver();//start animation loop
            inited = true;
        }
    }



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
            var _creaseParams = creaseParams[i];//face1Ind, vert1Ind, face2Ind, ver2Ind, edgeInd, [angle, angleSeq]
            var type = (_creaseParams[5][0] != 0) ? 1 : 0;
            var targetTheta = _creaseParams[5][0] * Math.PI / 180;
            var targetThetaSeq = _creaseParams[5][1].map(function(x){return x * Math.PI / 180;});
            if (targetThetaSeq.length == 0){
                targetThetaSeq = [0, targetTheta];
            }
            
            //edge, face1Index, face2Index, targetTheta, targetThetaSeq, type, node1, node2, index, edgeInd
            creases.push(new Crease(
                edges[_creaseParams[4]],
                _creaseParams[0],
                _creaseParams[2],
                targetTheta,
                targetThetaSeq,
                type,
                nodes[_creaseParams[1]],
                nodes[_creaseParams[3]],
                i,
                _creaseParams[4]
            ));
        }

        vertices = [];
        for (var i=0;i<nodes.length;i++){
            vertices.push(nodes[i].getOriginalPosition());
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

    function getMaxTargetThetaSeqLength(){
        return Math.max(...creases.map(c => c.targetThetaSeq.length));
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

        initStepper: initStepper,

        getNodes: getNodes,
        getEdges: getEdges,
        getFaces: getFaces,
        getCreases: getCreases,
        getMaxTargetThetaSeqLength: getMaxTargetThetaSeqLength,
        getGeometry: getGeometry,//for save stl
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