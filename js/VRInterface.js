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

    connect();

    var yOffset = 1.6;
    var scale = 0.5;

    window.addEventListener( 'vr controller connected', function( event ){

        var controllerIndex = controllers.length;

        var controller = event.detail;
        scene.add( controller );

        controller.standingMatrix = renderer.vr.getStandingMatrix();
        controller.head = camera;

        var
        meshColorOff = 0xFF4040,
        meshColorOn  = 0xFFFF00,
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


        // var guiInputHelper = dat.GUIVR.addInputObject( controller )
        // scene.add( guiInputHelper )
        //

        controller.addEventListener( 'primary press began', function( event ){
            event.target.userData.mesh.material.color.setHex( meshColorOn );
            states[controllerIndex] = true;
            // guiInputHelper.pressed( true );
        });
        controller.addEventListener( 'primary press ended', function( event ){
            event.target.userData.mesh.material.color.setHex( meshColorOff );
            states[controllerIndex] = false;
            if (nodes[controllerIndex]) {
                nodes[controllerIndex].setFixed(false);
                globals.fixedHasChanged = true;
            }

            // guiInputHelper.pressed( false );
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
                var y = 0;
                var vrScale = 1;
                if (globals.vrEnabled) {
                    y = yOffset;
                    vrScale = scale;
                    $link.html("EXIT VR");
                    renderer.vr.setDevice( display );
                    renderer.vr.standing = true;
                    globals.threeView.setBackgroundColor("000000");
                } else {
                    globals.model.reset();
                    globals.threeView.resetCamera();
                    $link.html("ENTER VR");
                    globals.threeView.setBackgroundColor();
                }
                globals.threeView.modelWrapper.scale.set(vrScale, vrScale, vrScale);
                globals.threeView.modelWrapper.position.set(0,y,0);
                _.each(controllers, function(controller){
                    _.each(controller.children, function(child){
                        child.visible = globals.vrEnabled;
                    });
                });
                if (callback) callback();
            });
        } );
    }

    function render(){
        THREE.VRController.update();
        checkForIntersections();
        renderer.render( scene, camera );
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

                if (states[i] && nodes[i]){
                    //drag node
                    if (!nodes[i].isFixed()) {
                        nodes[i].setFixed(true);
                        globals.fixedHasChanged = true;
                    }
                    position.y -= yOffset;
                    position.multiplyScalar(1/scale);
                    nodes[i].moveManually(position);
                    globals.nodePositionHasChanged = true;
                    continue;
                }

                var direction = new THREE.Vector3(0,0,-1);
                direction.applyQuaternion(controllers[i].quaternion);
                position.add(direction.clone().multiplyScalar(-0.05));

                var cast = new THREE.Raycaster(position, direction, -0.1, 10);
                var intersects = cast.intersectObjects(globals.model.getMesh(), false);
                if (intersects.length>0){
                    var intersection = intersects[0];
                    var face = intersection.face;
                    var point = intersection.point;

                    if (point.clone().sub(position).length() > 0.2) {
                        nodes[i] = null;
                        continue;
                    }

                    var verticesArray = globals.model.getVertices();
                    var vertices = [];
                    vertices.push(verticesArray[face.a]);
                    vertices.push(verticesArray[face.b]);
                    vertices.push(verticesArray[face.c]);
                    var dist = transformToGlobalCoords(vertices[0].clone()).sub(point).lengthSq();
                    var nodeIndex = face.a;
                    for (var j=1;j<3;j++){
                        var _dist = (transformToGlobalCoords(vertices[j].clone()).sub(point)).lengthSq();
                        if (_dist<dist){
                            dist = _dist;
                            if (j==1) nodeIndex = face.b;
                            else nodeIndex = face.c;
                        }
                    }
                    var nodesArray = globals.model.getNodes();
                    nodes[i] = nodesArray[nodeIndex];
                    object3D.position.copy(transformToGlobalCoords(nodes[i].getPosition().clone()));
                    object3D.visible = true;
                } else nodes[i] = null;

            } else {
                console.warn("bad controller ");
                console.log(controllers[i]);
            }
        }
    }

    function transformToGlobalCoords(position){
        position.multiplyScalar(scale);
        position.y += yOffset;
        return position;
    }

    return {
        render: render
    }

}