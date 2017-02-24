/**
 * Created by ghassaei on 2/22/17.
 */

globals = {};

$(function() {

    window.addEventListener('resize', function(){
        globals.threeView.onWindowResize();
    }, false);

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var raycasterPlane = new THREE.Plane(new THREE.Vector3(0,0,1));
    var isDragging = false;
    var mouseDown = false;


    $(document).dblclick(function() {
    });

    document.addEventListener('mousedown', function(){
        mouseDown = true;
    }, false);
    document.addEventListener('mouseup', function(e){
        isDragging = false;
        mouseDown = false;
    }, false);
    document.addEventListener( 'mousemove', mouseMove, false );
    function mouseMove(e){

        if (mouseDown) {
            isDragging = true;
        }

        e.preventDefault();
        mouse.x = (e.clientX/window.innerWidth)*2-1;
        mouse.y = - (e.clientY/window.innerHeight)*2+1;
        raycaster.setFromCamera(mouse, globals.threeView.camera);
    }

    globals = initGlobals();
    globals.model = initModel(globals);
    globals.dynamicModel = initDynamicModel(globals);
    globals.threeView.render();
});