/**
 * Created by ghassaei on 9/16/16.
 */

function initThreeView(globals) {

    var scene = new THREE.Scene();
    var modelWrapper = new THREE.Object3D();

    var camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 100);
    // var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000);//-40, 40);
    var renderer = new THREE.WebGLRenderer({antialias: true});
    var svgRenderer = new THREE.SVGRenderer();
    var controls;

    // var depthMaterial, effectComposer, depthRenderTarget;
    // var ssaoPass;

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
        // var ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        // scene.add(ambientLight);
        //scene.fog = new THREE.FogExp2(0xf4f4f4, 1.7);
        //renderer.setClearColor(scene.fog.color);

        scene.add(camera);

        camera.zoom = 30;
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
        controls.addEventListener("change", render);

        // var renderPass = new THREE.RenderPass( scene, camera );

        // Setup depth pass
        // depthMaterial = new THREE.MeshDepthMaterial();
        // depthMaterial.depthPacking = THREE.RGBADepthPacking;
        // depthMaterial.blending = THREE.NoBlending;

        // var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        // depthRenderTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
        //
        // // Setup SSAO pass
        // ssaoPass = new THREE.ShaderPass( THREE.SSAOShader );
        // ssaoPass.renderToScreen = true;
        // //ssaoPass.uniforms[ "tDiffuse" ].value will be set by ShaderPass
        // ssaoPass.uniforms[ "tDepth" ].value = depthRenderTarget.texture;
        // ssaoPass.uniforms[ 'size' ].value.set( window.innerWidth, window.innerHeight );
        // ssaoPass.uniforms[ 'cameraNear' ].value = camera.near;
        // ssaoPass.uniforms[ 'cameraFar' ].value = camera.far;
        // ssaoPass.uniforms[ 'onlyAO' ].value = 0;
        // ssaoPass.uniforms[ 'aoClamp' ].value = 0.7;
        // ssaoPass.uniforms[ 'lumInfluence' ].value = 0.8;
        // // Add pass to effect composer
        // effectComposer = new THREE.EffectComposer( renderer );
        // effectComposer.addPass( renderPass );
        // effectComposer.addPass( ssaoPass );
    }

    function render() {
        console.log("here");
        if (!animationRunning) {
            console.log("render");
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
        _loop(callback);

    }

    function pauseAnimation(){
        if (animationRunning) pauseFlag = true;
    }

    function running(){
        return animationRunning;
    }

    function _render(){
        if (globals.vrEnabled){
            globals.vive.render();
            return;
        }
        // if (globals.ambientOcclusion) {
        //     // Render depth into depthRenderTarget
        //     scene.overrideMaterial = depthMaterial;
        //     renderer.render(scene, camera, depthRenderTarget, true);
        //     // Render renderPass and SSAO shaderPass
        //     scene.overrideMaterial = null;
        //     effectComposer.render();
        //     return;
        // }
        renderer.render(scene, camera);
    }

    function _loop(callback){
        callback();
        if (globals.vrEnabled){
            globals.vive.effect.requestAnimationFrame(function(){
                _loop(callback);
            });
            _render();
            return;
        }
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
        controls.update();
        _render();
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
        // camera.left = -window.innerWidth / 2;
        // camera.right = window.innerWidth / 2;
        // camera.top = window.innerHeight / 2;
        // camera.bottom = -window.innerHeight / 2;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
        controls.handleResize();

        // var width = window.innerWidth;
        // var height = window.innerHeight;

        // ssaoPass.uniforms[ 'size' ].value.set( width, height );
        // var pixelRatio = renderer.getPixelRatio();
        // var newWidth  = Math.floor( width / pixelRatio ) || 1;
        // var newHeight = Math.floor( height / pixelRatio ) || 1;
        // depthRenderTarget.setSize( newWidth, newHeight );
        // effectComposer.setSize( newWidth, newHeight );

        render();
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
        render: render,
        onWindowResize: onWindowResize,
        startAnimation: startAnimation,
        pauseAnimation: pauseAnimation,
        enableControls: enableControls,
        scene: scene,
        camera: camera,
        renderer: renderer,
        modelWrapper:modelWrapper,
        running: running,
        setScale:setScale,
        saveSVG: saveSVG
    }
}