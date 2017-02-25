/**
 * Created by ghassaei on 9/16/16.
 */

function initThreeView(globals) {

    var scene = new THREE.Scene();
    var patternWrapper = new THREE.Object3D();
    var modelWrapper = new THREE.Object3D();
    var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -1000, 1000);//-40, 40);
    var renderer = new THREE.WebGLRenderer({antialias: true});
    var controls;

    var animationRunning = false;
    var pauseFlag = false;

    init();

    function init() {

        var container = $("#threeContainer");
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.append(renderer.domElement);

        scene.background = new THREE.Color(0xe6e6e6);
        scene.add(patternWrapper);
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
        //scene.fog = new THREE.FogExp2(0xf4f4f4, 1.7);
        //renderer.setClearColor(scene.fog.color);

        camera.zoom = 15;
        camera.updateProjectionMatrix();
        camera.position.x = 40;
        camera.position.y = 40;
        camera.position.z = 40;

        controls = new THREE.OrbitControls(camera, container.get(0));
        controls.addEventListener('change', render);

        render();
    }

    function render() {
        if (!animationRunning) {
            _render();
        }
    }

    function startAnimation(callback){
        console.log("starting animation");
        if (animationRunning){
            console.warn("animation already running");
            return;
        }
        animationRunning = true;
        _loop(function(){
            // if (!globals.stlEditing) //only run dynamic sim if not editing stl
                callback();
            _render();
        });

    }

    function pauseAnimation(){
        if (animationRunning) pauseFlag = true;
    }

    function _render(){
        renderer.render(scene, camera);
    }

    function _loop(callback){
        callback();
        requestAnimationFrame(function(){
            if (pauseFlag) {
                pauseFlag = false;
                animationRunning = false;
                console.log("pausing animation");
                return;
            }
            _loop(callback);
        });
    }

    function sceneAddCrease(object) {
        patternWrapper.add(object);
    }

    function sceneRemoveCrease(object) {
        patternWrapper.remove(object);
    }

    function sceneClearPattern() {
        patternWrapper.children = [];
    }

    function sceneAddModel(object){
        modelWrapper.add(object);
    }

    function sceneRemoveModel(object){
        modelWrapper.remove(object);
    }

    function sceneClearModel(object){
        modelWrapper.children =[];
    }

    function sceneMakeModelFromPattern(){
        modelWrapper.children = [];
        //todo copy pattern to model
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.left = -window.innerWidth / 2;
        camera.right = window.innerWidth / 2;
        camera.top = window.innerHeight / 2;
        camera.bottom = -window.innerHeight / 2;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

        render();
    }

    function enableControls(state){
        controls.enabled = state;
        controls.enableRotate = state;
    }


    return {
        sceneAddCrease: sceneAddCrease,
        sceneRemoveCrease: sceneRemoveCrease,
        sceneClearPattern: sceneClearPattern,
        sceneAddModel: sceneAddModel,
        sceneRemoveModel: sceneRemoveModel,
        sceneClearModel: sceneClearModel,
        render: render,
        onWindowResize: onWindowResize,
        startAnimation: startAnimation,
        pauseAnimation: pauseAnimation,
        enableControls: enableControls,
        scene: scene,
        camera: camera
    }
}