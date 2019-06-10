/**
 * Created by ghassaei on 9/16/16.
 */

import * as THREE from "../import/three.module";
import { TrackballControls } from "../import/trackballcontrols";

function initThreeView(globals) {
  // todo, make sure whatever is calling this is waiting for DOM to load
  // to get the client rect below
  const container = document.querySelector("#simulator-container");
  const rect = container.getBoundingClientRect();

  const scene = new THREE.Scene();
  const modelWrapper = new THREE.Object3D();

  const camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 500);
  // var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2,
  // window.innerHeight / 2, window.innerHeight / -2, -10000, 10000);//-40, 40);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // var svgRenderer = new THREE.SVGRenderer();
  let controls;

  init();

  function init() {
    // const container = $("#simulator-container");
    // const rect = document.querySelector("#simulator-container")
    //   .getBoundingClientRect();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(rect.width, rect.height);
    container.append(renderer.domElement);

    scene.background = new THREE.Color(0xffffff); // new THREE.Color(0xe6e6e6);
    setBackgroundColor();
    scene.add(modelWrapper);

    // shining from above
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight1.position.set(100, 100, 100);
    scene.add(directionalLight1);

    // shining from below
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(0, -100, 0);
    scene.add(directionalLight2);

    const spotLight1 = new THREE.SpotLight(0xffffff, 0.3);
    spotLight1.position.set(0, 100, 200);
    scene.add(spotLight1);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // var directionalLight4 = new THREE.DirectionalLight(0xffffff, 0.3);
    // directionalLight4.position.set(0, -100, 0);
    // scene.add(directionalLight4);
    // var directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.8);
    // directionalLight3.position.set(-100, -30, 0);
    // scene.add(directionalLight3);
    // var directionalLight6 = new THREE.DirectionalLight(0xffffff, 0.3);
    // directionalLight6.position.set(0, 30, 100);
    // scene.add(directionalLight6);
    // var directionalLight5 = new THREE.DirectionalLight(0xffffff, 0.3);
    // directionalLight5.position.set(0, 30, -100);
    // scene.add(directionalLight5);

    // var ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    // scene.add(ambientLight);
    // scene.fog = new THREE.FogExp2(0xf4f4f4, 1.7);
    // renderer.setClearColor(scene.fog.color);

    scene.add(camera);

    resetCamera();

    controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 4.0;
    controls.zoomSpeed = 15;
    controls.noPan = true;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.minDistance = 0.1;
    controls.maxDistance = 30;


    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // spotLight1.castShadow = true;
    // spotLight1.shadowDarkness = 0.5;

    // controls.addEventListener("change", render);

    _render(); // render before model loads


    directionalLight1.castShadow = true;
    // directionalLight1.shadowMapWidth = 4096; // default is 512
    // directionalLight1.shadowMapHeight = 4096; // default is 512
    // directionalLight1.shadow.mapSize.Width = 8192; // default is 512
    // directionalLight1.shadow.mapSize.Height = 8192; // default is 512
    directionalLight1.shadow.mapSize.width = 4096;
    directionalLight1.shadow.mapSize.height = 4096;
    directionalLight1.shadow.camera.near = 0.5;
    directionalLight1.shadow.camera.far = 500;

    // directionalLight2.castShadow = true;
    // directionalLight3.castShadow = true;
    // directionalLight4.castShadow = true;
    // directionalLight5.castShadow = true;
    // directionalLight6.castShadow = true;
  }

  function resetCamera() {
    camera.zoom = 7;
    camera.fov = 100;
    // camera.lookAt(new THREE.Vector3(0,10,0));
    // camera.up = new THREE.Vector3(0,1,0);

    camera.updateProjectionMatrix();
    camera.position.x = 4;
    camera.position.y = 4;
    camera.position.z = 4;
    // camera.lookAt.x = 0;
    // camera.lookAt.y = 10;
    // camera.lookAt.z = 0;
    // camera.lookAt(new THREE.Vector3(100,100,100));
    // camera.lookAt({x:0, y:100, z:0});
    if (controls) setCameraIso();
  }

  function setCameraX(sign) {
    controls.reset(new THREE.Vector3(sign, 0, 0));
  }
  function setCameraY(sign) {
    controls.reset(new THREE.Vector3(0, sign, 0));
  }
  function setCameraZ(sign) {
    controls.reset(new THREE.Vector3(0, 0, sign));
  }
  function setCameraIso() {
    controls.reset(new THREE.Vector3(1, 1, 1));
  }

  function startAnimation() {
    console.log("starting animation");
    renderer.setAnimationLoop(_loop);
  }

  function pauseSimulation() {
    globals.simulationRunning = false;
    console.log("pausing simulation");
  }

  function startSimulation() {
    console.log("starting simulation");
    globals.simulationRunning = true;
  }

  function _render() {
    if (globals.vrEnabled) {
      globals.vive.render();
      return;
    }
    renderer.render(scene, camera);
    if (globals.capturer) {
      if (globals.capturer === "png") {
        const canvas = globals.threeView.renderer.domElement;
        canvas.toBlob((blob) => {
          saveAs(blob, `${globals.screenRecordFilename}.png`);
        }, "image/png");
        globals.capturer = null;
        globals.shouldScaleCanvas = false;
        globals.shouldAnimateFoldPercent = false;
        globals.threeView.onWindowResize();
        return;
      }
      globals.capturer.capture(renderer.domElement);
    }
  }

  function _loop() {
    if (globals.needsSync) {
      globals.model.sync();
    }
    if (globals.simNeedsSync) {
      globals.model.syncSolver();
    }
    if (globals.simulationRunning) globals.model.step();
    if (globals.vrEnabled) {
      _render();
      return;
    }
    controls.update();
    _render();
  }

  function sceneAddModel(object) {
    modelWrapper.add(object);
  }

  function onWindowResize() {

    if (globals.vrEnabled) {
      globals.warn("Can't resize window when in VR mode.");
      return;
    }
    // camera.aspect = window.innerWidth / window.innerHeight;
    // const rect = document.getElementById("simulator-container")
    //   .getBoundingClientRect();
    // camera.aspect = rect.width / rect.height;
    camera.aspect = window.innerWidth / window.innerHeight;
    // camera.left = -window.innerWidth / 2;
    // camera.right = window.innerWidth / 2;
    // camera.top = window.innerHeight / 2;
    // camera.bottom = -window.innerHeight / 2;
    camera.updateProjectionMatrix();

    let scale = 1;
    if (globals.shouldScaleCanvas) scale = globals.capturerScale;
    // renderer.setSize(scale*window.innerWidth, scale*window.innerHeight);
    renderer.setSize(scale * window.innerWidth * 0.5, scale * window.innerHeight * 0.5);
    // console.log("new rect", rect.width, rect.height, scale);
    // renderer.setSize(scale*rect.width, scale*rect.height);
    controls.handleResize();
  }

  function enableControls(state) {
    controls.enabled = state;
    controls.enableRotate = state;
  }

  // function saveSVG() {
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
  //     if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
  //         source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  //     }
  //     if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
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

  function resetModel() {
    modelWrapper.rotation.set(0, 0, 0);
  }

  function setBackgroundColor(color = globals.backgroundColor) {
    scene.background.setStyle(`#${color}`);
  }

  return {
    sceneAddModel,
    onWindowResize,

    startAnimation,
    startSimulation,
    pauseSimulation,

    enableControls, // user interaction
    scene,
    camera, // needed for user interaction
    renderer, // needed for VR
    modelWrapper,

    // saveSVG, // svg screenshot

    setCameraX,
    setCameraY,
    setCameraZ,
    setCameraIso,

    resetModel, // reset model orientation
    resetCamera,
    setBackgroundColor
  };
}

export default initThreeView;
