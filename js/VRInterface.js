/**
 * Created by amandaghassaei on 5/10/17.
 */


function initViveInterface(globals){

    var $status = $("#VRstatus");

    if ( WEBVR.isAvailable() === false ) {
        $status.html("WebVR not supported by this browser<br/>see <a href='https://webvr.info/' target='_blank'>webvr.info</a> for more information.");
        $("#VRoptions").hide();
        return;
    }
    $status.html("No device connected.");

    var renderer = globals.threeView.renderer;
    var scene = globals.threeView.scene;
    var camera = globals.threeView.camera;

    var controllers = [];
    var states = [false, false];

    //vis
    var highlighters = [new Node(new THREE.Vector3()), new Node(new THREE.Vector3())];
    _.each(highlighters, function(highlighter){
        highlighter.setTransparentVR();
        scene.add(highlighter.getObject3D());
    });

    var nodes = [null, null];
    var intersections = [false, false];
    var guiHelpers = [null, null];

    connect();

    var variables = {
        scale: 0.5,
        foldPercent: globals.creasePercent*100,
        Reset: function(){
            globals.model.reset();
        },
        stepsPerFrame: globals.numSteps,
        damping: globals.percentDamping,
        strainMap: false,
        position: new THREE.Vector3(0,1.3,0)
    };

    var gui = dat.GUIVR.create( 'Settings' );
    gui.position.set( -0.033949220776551325, 2.2973055921574033, -1.0077168687920643 );
    gui.rotation.set( 0,0,0 );
    scene.add( gui );
    gui.visible = false;
    window.gui = gui;

    gui.add(variables, "foldPercent").min(-100).max(100).step(1).name("Fold Percent").onChange(function(val){
        globals.creasePercent = val/100;
        globals.shouldChangeCreasePercent = true;
        globals.controls.updateCreasePercent();//update other gui
    });
    gui.add(variables, "strainMap").name("Show Strain").onChange( function(val) {
        var mode = "color";
        if (val) mode = "axialStrain";
        globals.colorMode = mode;
        if (mode == "color") $("#coloredMaterialOptions").show();
        else $("#coloredMaterialOptions").hide();
        if (mode == "axialStrain") $("#axialStrainMaterialOptions").show();
        else $("#axialStrainMaterialOptions").hide();
        globals.model.setMeshMaterial();
        $(".radio>input[value="+mode+"]").prop("checked", true);
    });
    gui.add(variables,'Reset').name("Reset Simulation");
    gui.add(variables, "damping").min(0.1).max(1).step(0.01).name("Damping (0-1)").onChange( function(val) {
        globals.percentDamping = val;
        globals.materialHasChanged = true;
        globals.controls.setSliderInputVal("#percentDamping", val);
    });
    gui.add(variables, "stepsPerFrame").min(1).max(200).step(1).name("Num Steps Per Frame").onChange( function(val) {
        globals.numSteps = val;
        $(".numStepsPerRender").val(val);
    }).listen();;
    gui.add(variables, "scale").min(0.01).max(1).step(0.001).name("Scale").onChange( function(val) {
        globals.threeView.modelWrapper.scale.set(val, val, val);
    });
    var positionCallback = function(val){
        globals.threeView.modelWrapper.position.copy(variables.position);
    };
    var positionBound = 2;
    gui.add(variables.position, "x").min(-positionBound).max(positionBound).step(0.01).name("Position X").onChange(positionCallback);
    gui.add(variables.position, "z").min(-positionBound).max(positionBound).step(0.01).name("Position Y").onChange(positionCallback);//z and y are flipped
    gui.add(variables.position, "y").min(-positionBound).max(positionBound).step(0.01).name("Position Z").onChange(positionCallback);


    // var examplesMenu = dat.GUIVR.create( 'Examples' );
    // // gui.position.set( 0.2, 0.8, -1 );
    // // gui.rotation.set( Math.PI / -6, 0, 0 );
    // scene.add( examplesMenu );



    window.addEventListener( 'vr controller connected', function( event ){

        var controllerIndex = controllers.length;

        var controller = event.detail;
        scene.add( controller );

        controller.standingMatrix = renderer.vr.getStandingMatrix();
        controller.head = camera;

        var
        meshColorOff = 0x888888,
        meshColorOn  = 0xcccccc,
        controllerMaterial = new THREE.MeshStandardMaterial({
            color: meshColorOff
        }),
        controllerMesh = new THREE.Mesh(
            new THREE.CylinderGeometry( 0.005, 0.05, 0.1, 6 ),
            controllerMaterial
        ),
        handleMesh = new THREE.Mesh(
            new THREE.BoxGeometry( 0.03, 0.1, 0.03 ),
            controllerMaterial
        );

        controllerMaterial.flatShading = true;
        controllerMesh.rotation.x = -Math.PI / 2;
        handleMesh.position.y = -0.05;
        controllerMesh.add( handleMesh );
        controller.userData.mesh = controllerMesh;
        controller.add( controllerMesh );

        var guiInputHelper = dat.GUIVR.addInputObject( controller );
        scene.add( guiInputHelper.laser );
        guiHelpers[controllerIndex] = guiInputHelper;


        controller.addEventListener( 'primary press began', function( event ){
            event.target.userData.mesh.material.color.setHex( meshColorOn );
            states[controllerIndex] = true;
            if (intersections[controllerIndex] || nodes[controllerIndex]) {
                guiInputHelper.laser.pressed( false );
            } else guiInputHelper.laser.pressed( true );
        });
        controller.addEventListener( 'primary press ended', function( event ){
            event.target.userData.mesh.material.color.setHex( meshColorOff );
            states[controllerIndex] = false;
            if (nodes[controllerIndex]) {
                nodes[controllerIndex].setFixed(false);
                globals.fixedHasChanged = true;
            }
            guiInputHelper.laser.pressed( false );
        });

        controller.addEventListener( 'disconnected', function( event ){
            states[controllerIndex] = false;
            controller.parent.remove( controller )
        });

        controllers.push(controller);
    });

    function connect(){

        WEBVR.getVRDisplay( function ( display ) {
            var $link = $("#enterVR");
            if (!display) {
                $status.html("No VR device detected.  Check that you are connected to Steam VR and your HMD has the latest firmware updates, then refresh this page.");
                $link.hide();
                return;
            }
            $status.html("VR device detected.  Hit the button below to enter VR.  If you have problems, check that you are connected to Steam VR and your HMD has the latest firmware updates.");
            $("#VRoptions").show();
            var button = WEBVR.getButton( display, renderer.domElement );
            $link.show();
            $link.html("ENTER VR");
            var callback = button.onclick;
            $link.click(function(e){
                e.preventDefault();
                globals.vrEnabled = !display.isPresenting;
                renderer.vr.enabled = globals.vrEnabled;

                if (globals.vrEnabled) {
                    globals.numSteps = 30;
                    $(".numStepsPerRender").val(globals.numSteps);
                    variables.stepsPerFrame = globals.numSteps;
                    globals.threeView.modelWrapper.scale.set(variables.scale, variables.scale, variables.scale);
                    globals.threeView.modelWrapper.position.copy(variables.position);
                    $link.html("EXIT VR");
                    renderer.vr.setDevice( display );
                    renderer.vr.standing = true;
                    globals.threeView.setBackgroundColor("000000");
                } else {
                    globals.numSteps = 100;
                    $(".numStepsPerRender").val(globals.numSteps);
                    globals.model.reset();
                    // globals.threeView.onWindowResize();
                    globals.threeView.resetCamera();
                    $link.html("ENTER VR");
                    globals.threeView.setBackgroundColor();
                    globals.threeView.modelWrapper.scale.set(1, 1, 1);
                    globals.threeView.modelWrapper.position.set(0,0,0);
                    // renderer.setPixelRatio( window.devicePixelRatio );
                    // renderer.setSize(window.innerWidth, window.innerHeight);
                }
                _.each(controllers, function(controller){
                    _.each(controller.children, function(child){
                        child.visible = globals.vrEnabled;
                    });
                });
                gui.visible = globals.vrEnabled;
                if (callback) callback();
            });
        } );
    }

    function render(){
        THREE.VRController.update();
        checkForIntersections();
        renderer.render( scene, camera );
    }


    var tMatrix = new THREE.Matrix4();
    var tDirection = new THREE.Vector3(0,0,-1);

    function disableLaserPointer(helper){
        helper.enabled = false;
        helper.laser.visible = false;
        helper.cursor.visible = false;
    }

    function checkForIntersections(){
        var numControllers = controllers.length;
        if (numControllers>2){
            console.warn("invalid num controllers: " + numControllers);
            numControllers = 2;
        }
        for (var i=0;i<numControllers;i++){
            var gamepad = controllers[i].gamepad;
            if (gamepad && gamepad.buttons && gamepad.buttons[0]){
                var object3D = highlighters[i].object3D;
                object3D.visible = false;

                if (!gamepad.pose.hasPosition || !gamepad.pose.hasOrientation) continue;

                var position = controllers[i].position.clone();
                position.applyMatrix4(renderer.vr.getStandingMatrix());

                tMatrix.identity().extractRotation(controllers[i].matrixWorld);
                tDirection.set(0, 0, -1).applyMatrix4(tMatrix).normalize();
                position.add(tDirection.clone().multiplyScalar(0.05));

                if (states[i] && nodes[i]){
                    //drag node
                    disableLaserPointer(guiHelpers[i]);
                    if (!nodes[i].isFixed()) {
                        nodes[i].setFixed(true);
                        globals.fixedHasChanged = true;
                    }

                    position.sub(variables.position);
                    position = transformToMeshCoords(position);
                    nodes[i].moveManually(position);
                    globals.nodePositionHasChanged = true;
                    continue;
                }

                var cast = new THREE.Raycaster(position, tDirection, 0, 1);
                var intersects = cast.intersectObjects(globals.model.getMesh(), false);
                if (intersects.length>0){
                    disableLaserPointer(guiHelpers[i]);
                    intersections[i] = true;
                    var intersection = intersects[0];
                    var face = intersection.face;
                    var point = intersection.point;

                    if ((point.clone().sub(position)).lengthSq() > 0.01) {
                        nodes[i] = null;
                        continue;
                    }

                    var positionsArray = globals.model.getPositionsArray();
                    var vertices = [];
                    vertices.push(new THREE.Vector3(positionsArray[3*face.a], positionsArray[3*face.a+1], positionsArray[3*face.a+2]));
                    vertices.push(new THREE.Vector3(positionsArray[3*face.b], positionsArray[3*face.b+1], positionsArray[3*face.b+2]));
                    vertices.push(new THREE.Vector3(positionsArray[3*face.c], positionsArray[3*face.c+1], positionsArray[3*face.c+2]));
                    var dist = transformToGlobalCoords(vertices[0].clone()).sub(point).lengthSq();
                    var nodeIndex = face.a;
                    for (var j=1;j<3;j++){
                        var _dist = (transformToGlobalCoords(vertices[j].clone()).sub(point)).lengthSq();
                        if (_dist<dist){
                            dist = _dist;
                            if (j<2) nodeIndex = face.b;
                            else nodeIndex = face.c;
                        }
                    }
                    var nodesArray = globals.model.getNodes();
                    nodes[i] = nodesArray[nodeIndex];
                    object3D.position.copy(transformToGlobalCoords(nodes[i].getPosition().clone()));
                    object3D.visible = true;
                } else {
                    intersections[i] = false;
                    nodes[i] = null;
                    guiHelpers[i].enabled = true;
                }

            } else {
                console.warn("bad controller ");
                console.log(controllers[i]);
            }
        }
    }

    function transformToGlobalCoords(position){
        position.multiplyScalar(variables.scale);
        position.add(variables.position);
        return position;
    }
    function transformToMeshCoords(position){
        position.multiplyScalar(1/variables.scale);
        return position;
    }

    return {
        render: render
    }

}