/**
 * Created by amandaghassaei on 5/5/17.
 */


function init3DUI(globals) {

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var raycasterPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1));
    var isDragging = false;
    var draggingNode = null;
    var draggingNodeFixed = false;
    var mouseDown = false;
    var highlightedObj;

    var highlighter1 = new Node(new THREE.Vector3());
    highlighter1.setTransparent();
    globals.threeView.scene.add(highlighter1.getObject3D());

    var n1 = new Node(new THREE.Vector3());
    var n2 = new Node(new THREE.Vector3());

    let highlighter2 = new Beam([n1, n2]);
    highlighter2.setTransparent();
    globals.threeView.scene.add(highlighter2.getObject3D());

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
            globals.fixedHasChanged = true;
            globals.threeView.enableControls(true);
            setHighlightedObj(null);
            globals.shouldCenterGeo = true;
        }
        mouseDown = false;
    }, false);
    document.addEventListener( 'mousemove', mouseMove, false );
    function mouseMove(e){

        if (mouseDown) {
            isDragging = true;
        }

        if (!globals.userInteractionEnabled) return;

        // e.preventDefault();
        mouse.x = (e.clientX/window.innerWidth)*2-1;
        mouse.y = - (e.clientY/window.innerHeight)*2+1;
        raycaster.setFromCamera(mouse, globals.threeView.camera);

        var _highlightedObj = null;
        if (!isDragging) {
            _highlightedObj = checkForIntersections(e, globals.model.getMesh());
            setHighlightedObj(_highlightedObj);
        } else if (isDragging && highlightedObj && highlightedObj.getPosition){
            if (!draggingNode) {
                draggingNode = highlightedObj;
                draggingNodeFixed = draggingNode.isFixed();
                draggingNode.setFixed(true);
                globals.fixedHasChanged = true;
                globals.threeView.enableControls(false);
            }
            var intersection = getIntersectionWithObjectPlane(highlightedObj.getPosition().clone());
            highlightedObj.moveManually(intersection);
            globals.nodePositionHasChanged = true;
        }

        if (highlightedObj){
            if (highlightedObj.getPosition) {
                var position = highlightedObj.getPosition();
                highlighter1.getObject3D().position.set(position.x, position.y, position.z);
            } else {
                var pos1 = highlightedObj.edge.nodes[0].getPosition();
                var pos2 = highlightedObj.edge.nodes[1].getPosition();

                const direction = new THREE.Vector3().subVectors(pos2, pos1);
                const length = direction.length();
                highlighter2.getObject3D().scale.set(1, length, 1);
                const midpoint = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);
                highlighter2.getObject3D().position.copy(midpoint);

                const axis = new THREE.Vector3(0, 1, 0);
                const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction.clone().normalize());
                highlighter2.getObject3D().setRotationFromQuaternion(quaternion);
            }
        }
    }

    function getIntersectionWithObjectPlane(position){
        var cameraOrientation = globals.threeView.camera.getWorldDirection();
        var dist = position.dot(cameraOrientation);
        raycasterPlane.set(cameraOrientation, -dist);
        var intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(raycasterPlane, intersection);
        return intersection;
    }

    function setHighlightedObj(object){
        if (highlightedObj && (object != highlightedObj)) {
            // highlightedObj.unhighlight();
            highlighter1.getObject3D().visible = false;
            console.log(highlighter2);
            highlighter2.getObject3D().visible = false;
        }
        highlightedObj = object;
        console.log(highlightedObj);
        if (highlightedObj) {
            // highlightedObj.highlight();
            if (highlightedObj.getPosition) {
                highlighter1.getObject3D().visible = true;
            } else {
                console.log(highlighter2);
                highlighter2.getObject3D().visible = true;
            }
        }
    }

    function checkForIntersections(e, objects){
        var _highlightedObj = null;
        var intersections = raycaster.intersectObjects(objects, false);
        if (intersections.length>0){
            var face = intersections[0].face;
            var position = intersections[0].point;
            var positionsArray = globals.model.getPositionsArray();
            var res = [face.a, face.b, face.c]
               .map(v => [v, (new THREE.Vector3(positionsArray[3*v], positionsArray[3*v+1], positionsArray[3*v+2]))])
               .map(l => [l[0], (l[1].clone().sub(position)).lengthSq()])
               .sort((a, b) => a[1] - b[1]);
            var nodeIndex = res[0][0];
            var max_dist = res[2][1];
            var min_dist = res[0][1];
            if (min_dist / (max_dist + min_dist) < 0.1) {
                var nodesArray = globals.model.getNodes();
                _highlightedObj = nodesArray[nodeIndex];
            } else {
                var creaseArray = globals.model.getCreases();
                for (var i=0; i<creaseArray.length; i++){
                    var edge = creaseArray[i].edge;
                    if ((edge.nodes[0].getIndex() == res[0][0] && edge.nodes[1].getIndex() == res[1][0]) ||
                        (edge.nodes[1].getIndex() == res[0][0] && edge.nodes[0].getIndex() == res[1][0])){
                        _highlightedObj = creaseArray[i];
                        break;
                    }
                }
            }
        }
        return _highlightedObj;
    }

    function hideHighlighters(){
        highlighter1.getObject3D().visible = false;
    }
    
    // globals.threeView.sceneAdd(raycasterPlane);

    return {
        hideHighlighters: hideHighlighters
    }

}