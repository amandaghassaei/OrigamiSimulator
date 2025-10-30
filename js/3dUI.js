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
    var highlightedObj; // can be Node or Crease

    var highlighter_node = new Node(new THREE.Vector3());
    highlighter_node.setTransparent();
    globals.threeView.scene.add(highlighter_node.getObject3D());

    var n1 = new Node(new THREE.Vector3());
    var n2 = new Node(new THREE.Vector3());

    let highlighter_crease = new Beam([n1, n2]);
    highlighter_crease.setTransparent();
    globals.threeView.scene.add(highlighter_crease.getObject3D());

    let selectedObj;

    globals.controls.setSlider("#targetAngleBottom>div", 0, -180, 180, 1, function(value){
        if (selectedObj){
            globals.pattern.setRawFoldAngles(
                function(foldAngles) {
                    var seq = foldAngles[selectedObj.edgeInd][1];
                    if (globals.keyframeIdx < seq.length) {
                        seq[globals.keyframeIdx] = value * Math.PI / 180;
                    }
                }
            );
            var crease = globals.model.getCreases()
            var seq = crease[selectedObj.getIndex()].targetThetaSeq;
            if (globals.keyframeIdx < seq.length) {
                seq[globals.keyframeIdx] = value * Math.PI / 180;
            }
            globals.creaseMaterialHasChanged = true;
            $("#angleSimple").html(value.toFixed(0));
        }
    });

    globals.controls.setSlider("#stiffnessBottom>div", 0, 0, 100, 1, function(value){
        if (selectedObj){
            var crease = globals.model.getCreases()
            crease[selectedObj.getIndex()].stiffness = value / 100;
            globals.creaseMaterialHasChanged = true;
            $("#stiffnessSimple").html(value.toFixed(0));
        }
    });

    let creaseSliderContainer = document.getElementById("creaseSliderContainer");

    var n1_ = new Node(new THREE.Vector3());
    var n2_ = new Node(new THREE.Vector3());

    let highlighted_selectedCrease = new Beam([n1_, n2_]);
    highlighted_selectedCrease.setHighlight();
    globals.threeView.scene.add(highlighted_selectedCrease.getObject3D());

    $(document).dblclick(function() {
    });

    function cursorOnPanel(e) {
        const rect = creaseSliderContainer.getBoundingClientRect();
        return (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
        );
    }

    function isNode(obj) {
        return (obj && obj.getPosition);
    }

    document.addEventListener('mousedown', function(e){
        if (cursorOnPanel(e)) return;
        mouseDown = true;
        if (highlightedObj && !isNode(highlightedObj)) {
            if (selectedObj === highlightedObj) {
                selectedObj = null;
            } else {
                selectedObj = highlightedObj;
                var crease = globals.model.getCreases()[selectedObj.getIndex()];
                var seq = crease.getTargetThetaSeq();
                var idx = Math.min(globals.keyframeIdx, seq.length - 1);
                var angle = seq[idx] * 180 / Math.PI;
                $("#angleSimple").html(angle.toFixed(0));
                $("#targetAngleBottom>div").slider("value", angle);
                var stiffness = crease.getStiffness() * 100;
                $("#stiffnessBottom>div").slider("value", stiffness);
                $("#stiffnessSimple").html(stiffness.toFixed(0));
            }
        }
        if (selectedObj) {
            highlighted_selectedCrease.getObject3D().visible = true;
            creaseSliderContainer.style.display = 'flex';
            creaseSliderContainer.style.left = e.clientX + 'px';
            creaseSliderContainer.style.top = e.clientY + 'px';
        } else {
            highlighted_selectedCrease.getObject3D().visible = false;
            creaseSliderContainer.style.display = 'none';
        }
        setAll3D();
    }, false);
    document.addEventListener('mouseup', function(e){
        if (cursorOnPanel(e)) return;
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
        if (cursorOnPanel(e)) {
            setAll3D();
            return;
        }
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
        } else if (isDragging && highlightedObj && isNode(highlightedObj)) {
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

        setAll3D();
    }

    function setAll3D() {
        if (highlightedObj){
            if (isNode(highlightedObj)){ 
                var position = highlightedObj.getPosition();
                highlighter_node.getObject3D().position.set(position.x, position.y, position.z);
            } else {
                var pos1 = highlightedObj.edge.nodes[0].getPosition();
                var pos2 = highlightedObj.edge.nodes[1].getPosition();
                setCrease3D(highlighter_crease.getObject3D(), pos1, pos2);
            }
        }

        if (selectedObj){
            var pos1 = selectedObj.edge.nodes[0].getPosition();
            var pos2 = selectedObj.edge.nodes[1].getPosition();
            setCrease3D(highlighted_selectedCrease.getObject3D(), pos1, pos2);
        }
    }

    function setCrease3D(object3D, pos1, pos2){
        const direction = new THREE.Vector3().subVectors(pos2, pos1);
        const length = direction.length();
        object3D.scale.set(1, length, 1);
        const midpoint = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);
        object3D.position.copy(midpoint);

        const axis = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction.clone().normalize());
        object3D.setRotationFromQuaternion(quaternion);
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
            highlighter_node.getObject3D().visible = false;
            highlighter_crease.getObject3D().visible = false;
        }
        highlightedObj = object;
        if (highlightedObj) {
            // highlightedObj.highlight();
            if (isNode(highlightedObj)) {
                highlighter_node.getObject3D().visible = true;
            } else {
                highlighter_crease.getObject3D().visible = true;
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
            var faceVertices = [face.a, face.b, face.c]
               .map(v => [v, (new THREE.Vector3(positionsArray[3*v], positionsArray[3*v+1], positionsArray[3*v+2]))])
            var res = faceVertices
               .map(l => [l[0], (l[1].clone().sub(position)).lengthSq()])
               .sort((a, b) => a[1] - b[1]);
            var nodeIndex = res[0][0];
            var max_dist = res[1][1];
            var min_dist = res[0][1];
            if (min_dist / (max_dist + min_dist) < 0.1) {
                var nodesArray = globals.model.getNodes();
                _highlightedObj = nodesArray[nodeIndex];
            } else {

                function closestPointOnSegment(a, b) {
                    const ab = b.clone().sub(a);
                    const ap = position.clone().sub(a);
                    const t = ap.dot(ab) / ab.lengthSq(); // projection factor
                    if (t < 0) return a.clone();
                    if (t > 1) return b.clone();
                    return a.clone().add(ab.multiplyScalar(t));
                
                }

                const edges = [
                    [0, 1],
                    [1, 2],
                    [2, 0]
                ];

                let closestEdge = [faceVertices[0][0], faceVertices[1][0]];
                let minDist = Infinity;

                edges.forEach(([a, b]) => {
                    const point = closestPointOnSegment(faceVertices[a][1], faceVertices[b][1]);
                    const dist = point.sub(position).lengthSq();
                    console.log(dist, minDist);
                    if (dist < minDist) {
                        minDist = dist;
                        closestEdge = [faceVertices[a][0], faceVertices[b][0]];
                    }
                });

                var creaseArray = globals.model.getCreases();
                for (var i=0; i<creaseArray.length; i++){
                    var edge = creaseArray[i].edge;
                    if ((edge.nodes[0].getIndex() == closestEdge[0] && edge.nodes[1].getIndex() == closestEdge[1]) ||
                        (edge.nodes[1].getIndex() == closestEdge[0] && edge.nodes[0].getIndex() == closestEdge[1])){
                        _highlightedObj = creaseArray[i];
                        break;
                    }
                }
            }
        }
        return _highlightedObj;
    }

    function hideHighlighters(){
        highlighter_node.getObject3D().visible = false;
    }
    
    // globals.threeView.sceneAdd(raycasterPlane);

    return {
        hideHighlighters: hideHighlighters
    }

}