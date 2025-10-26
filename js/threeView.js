/**
 * Created by ghassaei on 9/16/16.
 */

function initThreeView(globals) {

    var scene = new THREE.Scene();
    var modelWrapper = new THREE.Object3D();

    var camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 500);
    // var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000);//-40, 40);
    var renderer = new THREE.WebGLRenderer({antialias: true});
    // var svgRenderer = new THREE.SVGRenderer();
    var controls;

    init();

    function init() {

        var container = $("#threeContainer");
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.append(renderer.domElement);

        scene.background = new THREE.Color(0xffffff);//new THREE.Color(0xe6e6e6);
        setBackgroundColor();
        scene.add(modelWrapper);
        var directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(0, 100, 0);
        scene.add(directionalLight1);
        var directionalLight4 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight4.position.set(0, -100, 0);
        scene.add(directionalLight4);
        var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight2.position.set(100, -30, 0);
        scene.add(directionalLight2);
        var directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight3.position.set(-100, -30, 0);
        scene.add(directionalLight3);
        var directionalLight4 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight4.position.set(0, 30, 100);
        scene.add(directionalLight4);
        var directionalLight5 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight5.position.set(0, 30, -100);
        scene.add(directionalLight5);
        // var ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        // scene.add(ambientLight);
        //scene.fog = new THREE.FogExp2(0xf4f4f4, 1.7);
        //renderer.setClearColor(scene.fog.color);

        scene.add(camera);

        resetCamera();

        controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 4.0;
        controls.zoomSpeed = 15;
        controls.noPan = true;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        controls.minDistance = 1;
	    controls.maxDistance = 30;
        // controls.addEventListener("change", render);

        _render();//render before model loads

    }

    function resetCamera(){
        camera.zoom = 7;
        camera.updateProjectionMatrix();
        camera.position.x = 5;
        camera.position.y = 5;
        camera.position.z = 5;
        if (controls) setCameraIso();
    }

    function setCameraX(sign){
        controls.reset(new THREE.Vector3(sign,0,0));
    }
    function setCameraY(sign){
        controls.reset(new THREE.Vector3(0,sign,0));
    }
    function setCameraZ(sign){
        controls.reset(new THREE.Vector3(0,0,sign));
    }
    function setCameraIso(){
        controls.reset(new THREE.Vector3(1,1,1));
    }

    function startAnimation(){
        console.log("starting animation");
        renderer.animate(_loop);
        thetaLogging();
    }


    function testStableTime(){

    }

    function calInstability(){
        var actualThetas = getActualThetas(); // 弧度制

        var stiffnesses = [];
        var targetThetas = [];
        [stiffnesses, targetThetas] = getCreaseMetaInformation();

        console.assert(targetThetas.length === actualThetas.length);
        console.assert(stiffnesses.length === actualThetas.length);

        var instability = 0;
        for (var i = 0; i < actualThetas.length; i++){
            instability += Math.pow(actualThetas[i] - targetThetas[i], 2) * stiffnesses[i];
        }
        
        return instability;
    }

    function getActualThetas(){
        var thetasInfo = globals.dynamicSolver.getTheta();
        if (!thetasInfo || thetasInfo.length === 0) {
            console.log("u_theta has no data");
            return;
        }
        var actualThetas = [];
        for (var i = 0; i < thetasInfo.length; i++) {
            var thetaInfo = thetasInfo[i]; // [当前角度theta, 角速度w, normal1Index, normal2Index]
            actualThetas.push(thetaInfo[0]);
        }
        return actualThetas;
    }

    function getCreaseMetaInformation(){
        var stiffnesses = [];
        var targetThetas = [];
        var creaseMeta = globals.dynamicSolver.getCreaseMeta();
        var creaseLength = globals.model.getCreases().length;
        for (var i = 0; i < creaseLength; i++){
            stiffnesses[i] = creaseMeta[i * 4];
            targetThetas[i] = creaseMeta[i * 4 + 2];
        }
        return [stiffnesses, targetThetas];
    }

    function thetaLogging(firstN = 50){
        window.setInterval(function(){
            var thetasInfo = globals.dynamicSolver.getTheta();
            if (!thetasInfo || thetasInfo.length === 0) {
                console.log("u_theta has no data");
                return;
            }

            // var fullSummary = [];
            // var summary = "";
            var actualThetas = [];            
            for (var i = 0; i < Math.min(firstN, thetasInfo.length); i++) {
                var thetaInfo = thetasInfo[i];
                actualThetas.push(thetaInfo[0]); // [当前角度theta, 角速度w, normal1Index, normal2Index]
                // fullSummary.push(i + ": (theta: " + (thetaInfo[0] / Math.PI * 180).toFixed(2) + ")" + " (w: " + (thetaInfo[1]).toFixed(2) + ") "+ "(" + thetaInfo[2] + "," + thetaInfo[3] + ")");
                // summary += i + ": " + (thetaInfo[0] / Math.PI * 180).toFixed(2) + ", ";
            }
            
            var stiffnesses = [];
            var targetThetas = [];
            [stiffnesses, targetThetas] = getCreaseMetaInformation();

            var thetaDiffLogging = "Difference: \n";
            var creaseLength = globals.model.getCreases().length;
            toFixedNum = 5;
            for (var i = 0; i < Math.min(firstN, creaseLength); i++){
                thetaDiffLogging += i + ": " + "actualTheta(" + (actualThetas[i] / Math.PI * 180).toFixed(toFixedNum) + ") - targetTheta(" + (targetThetas[i] / Math.PI * 180).toFixed(toFixedNum) + ") + stiffness(" + stiffnesses[i].toFixed(toFixedNum) + ")\n";
            }
            thetaDiffLogging += "Instability: " + calInstability().toFixed(toFixedNum) + "\n";
            console.log(thetaDiffLogging);
        }, 1000);
    }

    function pauseSimulation(){
        globals.simulationRunning = false;
        console.log("pausing simulation");
    }

    function startSimulation(){
        console.log("starting simulation");
        globals.simulationRunning = true;
    }

    var captureStats = $("#stopRecord>span");
    function _render(){
        if (globals.vrEnabled){
            globals.vive.render();
            return;
        }
        renderer.render(scene, camera);
        if (globals.capturer) {
            if (globals.capturer == "png"){
                var canvas = globals.threeView.renderer.domElement;
                canvas.toBlob(function(blob) {
                    saveAs(blob, globals.screenRecordFilename + ".png");
                }, "image/png");
                globals.capturer = null;
                globals.shouldScaleCanvas = false;
                globals.shouldAnimateFoldPercent = false;
                globals.threeView.onWindowResize();
                return;
            }
            captureStats.html("( " + ++globals.capturerFrames + " frames  at " + globals.currentFPS  + "fps )");
            globals.capturer.capture(renderer.domElement);
        }
    }

    function _loop(){
        if (globals.rotateModel !== null){
            if (globals.rotateModel == "x") modelWrapper.rotateX(globals.rotationSpeed);
            if (globals.rotateModel == "y") modelWrapper.rotateY(globals.rotationSpeed);
            if (globals.rotateModel == "z") modelWrapper.rotateZ(globals.rotationSpeed);
        }
        if (globals.needsSync){
            globals.model.sync();
        }
        if (globals.simNeedsSync){
            globals.model.syncSolver();
        }
        if (globals.simulationRunning) globals.model.step();
        if (globals.vrEnabled){
            _render();
            return;
        }
        controls.update();
        _render();
    }

    function sceneAddModel(object){
        modelWrapper.add(object);
    }

    function onWindowResize() {

        if (globals.vrEnabled){
            globals.warn("Can't resize window when in VR mode.");
            return;
        }

        camera.aspect = window.innerWidth / window.innerHeight;
        // camera.left = -window.innerWidth / 2;
        // camera.right = window.innerWidth / 2;
        // camera.top = window.innerHeight / 2;
        // camera.bottom = -window.innerHeight / 2;
        camera.updateProjectionMatrix();

        var scale = 1;
        if (globals.shouldScaleCanvas) scale = globals.capturerScale;
        renderer.setSize(scale*window.innerWidth, scale*window.innerHeight);
        controls.handleResize();
    }

    function enableControls(state){
        controls.enabled = state;
        controls.enableRotate = state;
    }

    // function saveSVG(){
    //     // svgRenderer.setClearColor(0xffffff);
    //     svgRenderer.setSize(window.innerWidth,window.innerHeight);
    //     svgRenderer.sortElements = true;
    //     svgRenderer.sortObjects = true;
    //     svgRenderer.setQuality('high');
    //     svgRenderer.render(scene,camera);
    //     //get svg source.
    //     var serializer = new XMLSerializer();
    //     var source = serializer.serializeToString(svgRenderer.domElement);
    //
    //     //add name spaces.
    //     if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
    //         source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    //     }
    //     if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
    //         source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    //     }
    //
    //     //add xml declaration
    //     source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    //
    //     var svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
    //     var svgUrl = URL.createObjectURL(svgBlob);
    //     var downloadLink = document.createElement("a");
    //     downloadLink.href = svgUrl;
    //     downloadLink.download =  globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded.svg";
    //     document.body.appendChild(downloadLink);
    //     downloadLink.click();
    //     document.body.removeChild(downloadLink);
    // }

    function resetModel(){
        modelWrapper.rotation.set(0,0,0);
    }

    function setBackgroundColor(color){
        if (color === undefined) color = globals.backgroundColor;
        scene.background.setStyle( "#" + color);
    }

    return {
        sceneAddModel: sceneAddModel,
        onWindowResize: onWindowResize,

        startAnimation: startAnimation,
        startSimulation: startSimulation,
        pauseSimulation: pauseSimulation,

        enableControls: enableControls,//user interaction
        scene: scene,
        camera: camera,//needed for user interaction
        renderer: renderer,//needed for VR
        modelWrapper:modelWrapper,

        // saveSVG: saveSVG,//svg screenshot

        setCameraX:setCameraX,
        setCameraY: setCameraY,
        setCameraZ: setCameraZ,
        setCameraIso: setCameraIso,

        resetModel: resetModel,//reset model orientation
        resetCamera:resetCamera,
        setBackgroundColor: setBackgroundColor
    }
}