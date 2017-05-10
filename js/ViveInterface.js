/**
 * Created by amandaghassaei on 5/10/17.
 */


function initViveInterface(globals){

    var $status = $("#VRstatus");

    if ( WEBVR.isAvailable() === false ) {
        $status.html("WebVR not supported by this browser<br/>see <a href='https://webvr.info/' target='_blank'>webvr.info</a> for more info.");
        $("#VRoptions").hide();
        return;
    }
    $status.html("No device connected.");
    $("#VRoptions").show();

    var mesh = new THREE.Mesh(new THREE.CubeGeometry(1, 1,1 ), new THREE.MeshLambertMaterial({color:0xff0000}));

    var controls = new THREE.VRControls(globals.threeView.camera);
    controls.standing = true;

    // controllers
    controller1 = new THREE.ViveController( 0 );
    var controller1.standingMatrix = controls.getStandingMatrix();
    globals.threeView.scene.add( controller1 );

    var controller2 = new THREE.ViveController( 1 );
    controller2.standingMatrix = controls.getStandingMatrix();
    globals.threeView.scene.add( controller2 );

    controller1.add(mesh.clone());
    controller2.add(mesh.clone());

    var effect = new THREE.VREffect(globals.threeView.renderer);

    connect();

    function connect(){
        WEBVR.getVRDisplay( function ( display ) {
            if (!display) return;
            $status.html("VR device detected.");
            setup();
            var button = WEBVR.getButton( display, globals.threeView.renderer.domElement );
            document.body.appendChild(button);
            button.onclick = function () {
				if (display.isPresenting) globals.vrEnabled = false;
                else globals.vrEnabled = true;
			};

        } );
    }

    function disconnect(){

    }

    function render(){
        controller1.update();
        controller2.update();
        controls.update();
        effect.render( globals.threeView.scene, globals.threeView.camera );
    }

    return {
        effect: effect,
        render: render
    }

}