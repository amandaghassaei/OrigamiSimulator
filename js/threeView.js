/**
 * Created by ghassaei on 9/16/16.
 */

function initThreeView(globals) {

    var scene = new THREE.Scene();
    var modelWrapper = new THREE.Object3D();
    var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000);//-40, 40);
    var renderer = new THREE.WebGLRenderer({antialias: true});
    var controls;

    var depthMaterial, effectComposer, depthRenderTarget;
    var ssaoPass;

    var animationRunning = false;
    var pauseFlag = false;

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
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        // scene.add(ambientLight);
        //scene.fog = new THREE.FogExp2(0xf4f4f4, 1.7);
        //renderer.setClearColor(scene.fog.color);

        scene.add(camera);

        camera.zoom = 5;
        camera.updateProjectionMatrix();
        camera.position.x = 200;
        camera.position.y = 200;
        camera.position.z = 200;

        controls = new THREE.OrthographicTrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.5;
        controls.zoomSpeed = 0.8;
        controls.noPan = true;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        controls.addEventListener("change", render);

        var renderPass = new THREE.RenderPass( scene, camera );

        // Setup depth pass
        depthMaterial = new THREE.MeshDepthMaterial();
        depthMaterial.depthPacking = THREE.RGBADepthPacking;
        depthMaterial.blending = THREE.NoBlending;

        var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        depthRenderTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );

        // Setup SSAO pass
        ssaoPass = new THREE.ShaderPass( THREE.SSAOShader );
        ssaoPass.renderToScreen = true;
        //ssaoPass.uniforms[ "tDiffuse" ].value will be set by ShaderPass
        ssaoPass.uniforms[ "tDepth" ].value = depthRenderTarget.texture;
        ssaoPass.uniforms[ 'size' ].value.set( window.innerWidth, window.innerHeight );
        ssaoPass.uniforms[ 'cameraNear' ].value = camera.near;
        ssaoPass.uniforms[ 'cameraFar' ].value = camera.far;
        ssaoPass.uniforms[ 'onlyAO' ].value = 0;
        ssaoPass.uniforms[ 'aoClamp' ].value = 0.7;
        ssaoPass.uniforms[ 'lumInfluence' ].value = 0.8;
        // Add pass to effect composer
        effectComposer = new THREE.EffectComposer( renderer );
        effectComposer.addPass( renderPass );
        effectComposer.addPass( ssaoPass );
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
            callback();
            _render();
        });

    }

    function pauseAnimation(){
        if (animationRunning) pauseFlag = true;
    }

    function running(){
        return animationRunning;
    }

    function _render(){
        if (globals.ambientOcclusion) {
            // Render depth into depthRenderTarget
            scene.overrideMaterial = depthMaterial;
            renderer.render(scene, camera, depthRenderTarget, true);
            // Render renderPass and SSAO shaderPass
            scene.overrideMaterial = null;
            effectComposer.render();
        } else {
            renderer.render(scene, camera);
        }
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

    function sceneAddModel(object){//beams and nodes
        modelWrapper.add(object);
    }

    function sceneClearModel(){
        modelWrapper.children = [];
    }

    function setScale(scale){
        modelWrapper.scale.set(scale, scale, scale);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.left = -window.innerWidth / 2;
        camera.right = window.innerWidth / 2;
        camera.top = window.innerHeight / 2;
        camera.bottom = -window.innerHeight / 2;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

        var width = window.innerWidth;
        var height = window.innerHeight;

        ssaoPass.uniforms[ 'size' ].value.set( width, height );
        var pixelRatio = renderer.getPixelRatio();
        var newWidth  = Math.floor( width / pixelRatio ) || 1;
        var newHeight = Math.floor( height / pixelRatio ) || 1;
        depthRenderTarget.setSize( newWidth, newHeight );
        effectComposer.setSize( newWidth, newHeight );

        render();
    }

    function enableControls(state){
        controls.enabled = state;
        controls.enableRotate = state;
    }


    return {
        sceneAddModel: sceneAddModel,
        sceneClearModel: sceneClearModel,
        render: render,
        onWindowResize: onWindowResize,
        startAnimation: startAnimation,
        pauseAnimation: pauseAnimation,
        enableControls: enableControls,
        scene: scene,
        camera: camera,
        running: running,
        setScale:setScale
    }
}