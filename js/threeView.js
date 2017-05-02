/**
 * Created by ghassaei on 9/16/16.
 */

function initThreeView(globals) {

    var scene = new THREE.Scene();
    var wrapper = new THREE.Object3D();
    var patternWrapper = new THREE.Object3D();
    var modelWrapper = new THREE.Object3D();
    var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000);//-40, 40);
    var renderer = new THREE.WebGLRenderer({antialias: true});
    var controls;

    var animationRunning = false;
    var pauseFlag = false;

    init();

    function init() {

        var container = $("#threeContainer");
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.append(renderer.domElement);

        scene.background = new THREE.Color(0xffffff);//new THREE.Color(0xe6e6e6);
        scene.add(wrapper);
        scene.add(patternWrapper);
        patternWrapper.visible = false;
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

        camera.zoom = 1;
        camera.updateProjectionMatrix();
        camera.position.x = 4000;
        camera.position.y = 4000;
        camera.position.z = 4000;

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
                render();//for good measure
                return;
            }
            _loop(callback);
        });
    }

    function sceneAddPattern(object) {
        patternWrapper.add(object);
    }

    function sceneRemovePattern(object) {
        patternWrapper.remove(object);
    }

    function sceneClearPattern() {
        patternWrapper.children = [];
    }

    function sceneAddModel(object){//beams and nodes
        modelWrapper.add(object);
    }

    function sceneClearModel(object){
        modelWrapper.children =[];
    }

    function sceneAdd(object){
        wrapper.add(object);
    }

    function sceneRemove(object){
        wrapper.remove(object);
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

    function centerModel(position){
        // modelWrapper.position.set(position.x, 0, position.z);
    }

    function getModelOffset(){
        return modelWrapper.position.clone();
    }


    return {
        sceneAddPattern: sceneAddPattern,
        sceneRemovePattern: sceneRemovePattern,
        sceneClearPattern: sceneClearPattern,
        sceneAddModel: sceneAddModel,
        sceneClearModel: sceneClearModel,
        centerModel: centerModel,
        sceneAdd: sceneAdd,
        sceneRemove: sceneRemove,
        render: render,
        onWindowResize: onWindowResize,
        startAnimation: startAnimation,
        pauseAnimation: pauseAnimation,
        enableControls: enableControls,
        getModelOffset: getModelOffset,
        scene: scene,
        camera: camera
    }
}