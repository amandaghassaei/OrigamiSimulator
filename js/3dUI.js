/**
 * Created by amandaghassaei on 5/5/17.
 */


function init3DUI(_globals) {

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var raycasterPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1));
    var isDragging = false;
    var draggingNode = null;
    var draggingNodeFixed = false;
    var mouseDown = false;
    var highlightedObj;
    
    
    $(document).dblclick(function() {
    });

    document.addEventListener('mousedown', function(){
        mouseDown = true;
    }, false);
    document.addEventListener('mouseup', function(e){
        isDragging = false;
        if (draggingNode){
            draggingNode.setFixed(draggingNodeFixed);
            draggingNode = null;
            _globals.fixedHasChanged = true;
            _globals.threeView.enableControls(true);
            setHighlightedObj(null);
        }
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
        raycaster.setFromCamera(mouse, _globals.threeView.camera);

        var _highlightedObj = null;
        if (!isDragging) {
            
            var objsToIntersect = [];
            //todo fix this
            // objsToIntersect = objsToIntersect.concat(_globals.model.getObjectsToIntersect());
            _highlightedObj = checkForIntersections(e, objsToIntersect);


            setHighlightedObj(_highlightedObj);
        }  else if (isDragging && highlightedObj){
            if (!draggingNode) {
                draggingNode = highlightedObj;
                draggingNodeFixed = draggingNode.isFixed();
                draggingNode.setFixed(true);
                _globals.fixedHasChanged = true;
                _globals.threeView.enableControls(false);
            }
            var intersection = getIntersectionWithObjectPlane(highlightedObj.getPosition().clone());
            intersection.sub(_globals.threeView.getModelOffset());
            highlightedObj.moveManually(intersection);
            _globals.nodePositionHasChanged = true;
        }
    }

    function getIntersectionWithObjectPlane(position){
        var cameraOrientation = _globals.threeView.camera.getWorldDirection();
        var dist = position.dot(cameraOrientation);
        raycasterPlane.set(cameraOrientation, -dist);
        var intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(raycasterPlane, intersection);
        return intersection;
    }

    // function getPointOfIntersectionWithObject(object){
    //     var intersections = raycaster.intersectObjects([object], false);
    //     if (intersections.length > 0) {
    //         return intersections[0].point;
    //     }
    //     console.warn("no intersection found");
    //     return null;
    // }

    function setHighlightedObj(object){
        if (highlightedObj && (object != highlightedObj)) {
            highlightedObj.unhighlight();
            // _globals.controls.hideMoreInfo();
        }
        highlightedObj = object;
        if (highlightedObj) highlightedObj.highlight();
    }

    function checkForIntersections(e, objects){
        var _highlightedObj = null;
        var intersections = raycaster.intersectObjects(objects, true);
        if (intersections.length > 0) {
            var objectFound = false;
            _.each(intersections, function (thing) {
                if (objectFound) return;
                if (thing.object && thing.object._myNode){
                    _highlightedObj = thing.object._myNode;
                    if (!_highlightedObj.fixed) return;
                    _highlightedObj.highlight();
                    objectFound = true;
                }
            });
        }
        return _highlightedObj;
    }
    
    
    // _globals.threeView.sceneAdd(raycasterPlane);

}