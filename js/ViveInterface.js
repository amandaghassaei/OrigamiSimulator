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

    var mesh = new THREE.Mesh(new THREE.CubeGeometry(0.01,0.01,0.01), new THREE.MeshLambertMaterial({color:0xff0000}));
    mesh.visible = false;

    var controls = new THREE.VRControls(globals.threeView.camera);
    controls.standing = true;

    // controllers
    var controller1 = new THREE.ViveController( 0 );
    controller1.standingMatrix = controls.getStandingMatrix();
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
            var button = WEBVR.getButton( display, globals.threeView.renderer.domElement );
            console.log(button);
            $("#VRoptions").html(button);
            var callback = button.onclick;
            button.onclick = function () {
				globals.vrEnabled = !display.isPresenting;
                var y = 0;
                if (globals.vrEnabled) y = 1;
                globals.threeView.modelWrapper.position.set(0,y,0);
                // var scale = 0.01;
                // globals.threeView.modelWrapper.scale.set(scale, scale, scale);
                if (callback) callback();
			};
        } );
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