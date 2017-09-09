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

    var geo = new THREE.CylinderGeometry(0, 0.05, 0.25, 4);
    geo.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
    var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color:0x444444}));
    mesh.position.set(0,0,0.125);
    mesh.visible = false;

    var controls = new THREE.VRControls(globals.threeView.camera);
    controls.standing = true;

    // controllers
    var controller1 = new THREE.ViveController( 0 );
    controller1.standingMatrix = controls.getStandingMatrix();
    controller1.head = globals.threeView.camera;
    globals.threeView.scene.add( controller1 );

    var controller2 = new THREE.ViveController( 1 );
    controller2.standingMatrix = controls.getStandingMatrix();
    controller2.head = globals.threeView.camera;
    globals.threeView.scene.add( controller2 );

    controller1.add(mesh.clone());
    controller2.add(mesh.clone());
    var controllersConnected = false;

    var controllers = [controller1, controller2];
    var controllerStates = [false, false];

    //vis
    var highlighters = [new Node(new THREE.Vector3()), new Node(new THREE.Vector3())];
    _.each(highlighters, function(highlighter){
        highlighter.setTransparentVR();
        globals.threeView.scene.add(highlighter.getObject3D());
    });

    var nodes = [null, null];
    var releaseEvent = [false, false];
    var effect = new THREE.VREffect(globals.threeView.renderer);

    connect();

    var yOffset = 1.6;
    var scale = 0.5;

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
            var button = WEBVR.getButton( display, globals.threeView.renderer.domElement );
            $link.show();
            $link.html("ENTER VR");
            var callback = button.onclick;
            $link.click(function(e){
                e.preventDefault();
                globals.vrEnabled = !display.isPresenting;
                var y = 0;
                var vrScale = 1;
                if (globals.vrEnabled) {
                    y = yOffset;
                    vrScale = scale;
                    $link.html("EXIT VR");
                } else {
                    globals.model.reset();
                    globals.threeView.resetCamera();
                    $link.html("ENTER VR");
                }
                globals.threeView.modelWrapper.scale.set(vrScale, vrScale, vrScale);
                globals.threeView.modelWrapper.position.set(0,y,0);
                _.each(controller1.children, function(child){
                    child.visible = globals.vrEnabled;
                });
                _.each(controller2.children, function(child){
                    child.visible = globals.vrEnabled;
                });
                if (!controllersConnected && globals.vrEnabled) {
                    setControllerEvents();
                    controllersConnected = true;
                }
                if (callback) callback();
            });
        } );
    }

    function setControllerEvents(){
        controller1.addEventListener('triggerdown', function() {
            controllerStates[0] = true;
        });
        controller2.addEventListener('triggerdown', function() {
            controllerStates[1] = true;
        });
        controller1.addEventListener('triggerup', function() {
            controllerStates[0] = false;
            releaseEvent[0] = true;
        });
        controller2.addEventListener('triggerup', function() {
            controllerStates[1] = false;
            releaseEvent[1] = true;
        });
    }

    function render(){
        controller1.update();
        controller2.update();
        checkForIntersections();
        controls.update();
        effect.render( globals.threeView.scene, globals.threeView.camera );
    }

    function checkForIntersections(){
        for (var i=0;i<2;i++){
            var object3D = highlighters[i].object3D;
            var controller = controllers[i];
            object3D.visible = false;
            var position = controller.position.clone();
            position.applyMatrix4(controller.standingMatrix);

            if (controllerStates[i] && nodes[i]){
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

            if (releaseEvent[i]){
                if (nodes[i]) nodes[i].setFixed(false);
                globals.fixedHasChanged = true;
            }

            releaseEvent[i] = false;

            var direction = new THREE.Vector3(0,0,-1);
            direction.applyQuaternion(controller.quaternion);
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
        }
    }

    function transformToGlobalCoords(position){
        position.multiplyScalar(scale);
        position.y += yOffset;
        return position;
    }

    return {
        effect: effect,
        render: render
    }

}