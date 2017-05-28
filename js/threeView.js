/**
 * Created by ghassaei on 9/16/16.
 */

function initThreeView(globals) {

    var scene = new THREE.Scene();
    var modelWrapper = new THREE.Object3D();

    var camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 500);
    // var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000);//-40, 40);
    var renderer = new THREE.WebGLRenderer({antialias: true});
    var svgRenderer = new THREE.SVGRenderer();
    var controls;

    init();

    function init() {

        var container = $("#threeContainer");
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.append(renderer.domElement);

        scene.background = new THREE.Color(0xffffff);//new THREE.Color(0xe6e6e6);
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

        camera.zoom = 15;
        camera.updateProjectionMatrix();
        camera.position.x = 10;
        camera.position.y = 10;
        camera.position.z = 10;

        controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 4.0;
        controls.zoomSpeed = 15;
        controls.noPan = true;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        // controls.addEventListener("change", render);

        _render();//render before model loads

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
    function setCameraOrtho(){
        controls.reset(new THREE.Vector3(1,1,1));
    }

    function startAnimation(callback){
        console.log("starting animation");
        _loop(callback);

    }

    function pauseSimulation(){
        globals.simulationRunning = false;
        console.log("pausing simulation");
    }

    function startSimulation(){
        console.log("starting simulation");
        globals.simulationRunning = true;
    }

    function _render(){
        if (globals.vrEnabled){
            globals.vive.render();
            return;
        }
        renderer.render(scene, camera);
    }

    function _loop(callback){
        if (globals.needsSync){
            globals.model.sync();
            globals.needsSync = false;
        }
        if (globals.simulationRunning) callback();
        if (globals.vrEnabled){
            globals.vive.effect.requestAnimationFrame(function(){
                _loop(callback);
            });
            _render();
            return;
        }
        requestAnimationFrame(function(){
            _loop(callback);
        });
        controls.update();
        _render();
    }

    function sceneAddModel(object){//beams and nodes
        modelWrapper.add(object);
    }

    function sceneClearModel(){
        modelWrapper.children = [];
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        // camera.left = -window.innerWidth / 2;
        // camera.right = window.innerWidth / 2;
        // camera.top = window.innerHeight / 2;
        // camera.bottom = -window.innerHeight / 2;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
        controls.handleResize();
    }

    function enableControls(state){
        controls.enabled = state;
        controls.enableRotate = state;
    }

    function saveSVG(){
        // svgRenderer.setClearColor(0xffffff);
        svgRenderer.setSize(window.innerWidth,window.innerHeight);
        svgRenderer.sortElements = true;
        svgRenderer.sortObjects = true;
        svgRenderer.setQuality('high');
        svgRenderer.render(scene,camera);
        //get svg source.
        var serializer = new XMLSerializer();
        var source = serializer.serializeToString(svgRenderer.domElement);

        //add name spaces.
        if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }

        //add xml declaration
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

        var svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
        var svgUrl = URL.createObjectURL(svgBlob);
        var downloadLink = document.createElement("a");
        downloadLink.href = svgUrl;
        downloadLink.download =  globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }


    return {
        sceneAddModel: sceneAddModel,
        sceneClearModel: sceneClearModel,
        onWindowResize: onWindowResize,

        startAnimation: startAnimation,
        startSimulation: startSimulation,
        pauseSimulation: pauseSimulation,

        enableControls: enableControls,//user interaction
        scene: scene,
        camera: camera,//needed for user interaction
        renderer: renderer,//needed for VR
        modelWrapper:modelWrapper,

        saveSVG: saveSVG,//svg screenshot

        setCameraX:setCameraX,
        setCameraY: setCameraY,
        setCameraZ: setCameraZ,
        setCameraOrtho: setCameraOrtho
    }
}