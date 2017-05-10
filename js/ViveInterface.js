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

     WEBVR.getVRDisplay(function(display){
         if (display) document.body.appendChild(WEBVR.getButton(display, globals.threeView.renderer.domElement));
         $status.html("VR device detected.");
         setup();
    });

    var controls, controller1, controller2, effect;

    var mesh = new THREE.Mesh(new THREE.CubeGeometry(1, 1,1 ), new THREE.MeshLambertMaterial({color:0xff0000}));

    function setup(){

        controls = new THREE.VRControls(globals.threeView.camera);
        controls.standing = true;

        // controllers
        controller1 = new THREE.ViveController( 0 );
        controller1.standingMatrix = controls.getStandingMatrix();
        globals.threeView.scene.add( controller1 );

        controller2 = new THREE.ViveController( 1 );
        controller2.standingMatrix = controls.getStandingMatrix();
        globals.threeView.scene.add( controller2 );

        controller1.add(mesh.clone());
        controller2.add(mesh.clone());

        effect = new THREE.VREffect(globals.threeView.renderer);

    }

    function connect(){
        WEBVR.getVRDisplay( function ( display ) {

            document.body.appendChild( WEBVR.getButton( display, renderer.domElement ) );

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