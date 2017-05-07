/**
 * Created by amandaghassaei on 2/25/17.
 */

function initPattern(globals){

    var verticesRaw = [];//list of vertex3's
    //refs to vertex indices
    var mountainsRaw = [];
    var valleysRaw = [];
    var outlinesRaw = [];
    var cutsRaw = [];
    var triangulationsRaw = [];

    var vertices = [];//list of vertex3's (after merging)
    //refs to vertex indices
    var mountains = [];
    var valleys = [];
    var outlines = [];
    var cuts = [];
    var triangulations = [];
    var polygons = [];

    var SVGloader = new THREE.SVGLoader();

    function loadSVG(url){
        SVGloader.load(url, function(svg){
                var _$svg = $(svg);

                //format all lines
                var $paths = _$svg.children("path");
                $paths.css({fill:"none", 'stroke-dasharray':"none"});
                var _mountainAngles = [];
                var _valleyAngles = [];

                var $outlines = $paths.filter(function(){
                    var stroke = $(this).attr("stroke").toLowerCase();
                    return stroke == "#000000" || stroke == "#000";
                });

                var $mountains = $paths.filter(function(){
                    var color = hexToColor($(this).attr("stroke").toLowerCase());
                    if (color.r > 0 && color.g == 0 && color.b == 0){
                        _mountainAngles.push(-color.r*Math.PI);
                        return true;
                    }
                    return false;
                });

                var $valleys = $paths.filter(function(){
                    var color = hexToColor($(this).attr("stroke").toLowerCase());
                    if (color.b > 0 && color.g == 0 && color.r == 0){
                        _valleyAngles.push(color.b*Math.PI);
                        return true;
                    }
                    return false;
                });

                var $cuts = $paths.filter(function(){
                    var stroke = $(this).attr("stroke").toLowerCase();
                    return stroke == "#00ff00" || stroke == "#0f0";
                });

                var $triangulations = $paths.filter(function(){
                    var stroke = $(this).attr("stroke").toLowerCase();
                    return stroke == "#ffff00" || stroke == "#ff0";
                });

                parseSVG($outlines, $mountains, $valleys, $cuts, $triangulations, _mountainAngles, _valleyAngles);

                //find max and min vertices
                var max = new THREE.Vector3(0,0,0);
                var min = new THREE.Vector3(Infinity,Infinity,Infinity);
                for (var i=0;i<vertices.length;i++){
                    max.max(vertices[i]);
                    min.min(vertices[i]);
                }
                max.sub(min);
                var border = new THREE.Vector3(0.1, 0, 0.1);
                var scale = max.x;
                if (max.z < scale) scale = max.z;

                var strokeWidth = scale/300;
                $mountains.css({'stroke-dasharray': strokeWidth*6 + ', ' + strokeWidth*3 + ', ' + strokeWidth*1.5 + ', ' + strokeWidth*3});
                $valleys.css({'stroke-dasharray': strokeWidth*4 + ', ' + strokeWidth*3 + ', ' + strokeWidth*4 + ', ' + strokeWidth*3});
                $paths.css({'stroke-width':strokeWidth});

                border.multiplyScalar(scale);
                min.sub(border);
                max.add(border.multiplyScalar(2));
                var viewBoxTxt = min.x + " " + min.z + " " + max.x + " " + max.z;
                var $svg = $('<svg version="1.1" viewBox="' + viewBoxTxt + '" id="mySVG" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> </svg>');
                $svg.append($outlines);
                $svg.append($mountains);
                $svg.append($valleys);
                $svg.append($cuts);
                $svg.append($triangulations);

                $("#svgViewer").html($svg);
            },
            function(){},
            function(error){
            alert("Error loading SVG: " + url);
            console.log(error);
        });
    }

    function hexToColor(stroke){
        stroke = stroke.slice(1);
        if (stroke.length == 3){
            stroke = stroke[0]+stroke[0]+stroke[1]+stroke[1]+stroke[2]+stroke[2];
        }
        return new THREE.Color(parseInt("0x" + stroke));
    }

    function parsePath(_verticesRaw, _segmentsRaw, $paths, angles){
        for (var i=0;i<$paths.length;i++){
            var segments = $paths[i].getPathData();
            for (var j=0;j<segments.length;j++){
                var segment = segments[j];
                var type = segment.type;

                switch(type){

                    case "m"://dx, dy
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x += segment.values[0];
                        vertex.z += segment.values[1];
                        _verticesRaw.push(vertex);
                        break;

                    case "l"://dx, dy
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (angles && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(angles[i]);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x += segment.values[0];
                        vertex.z += segment.values[1];
                        _verticesRaw.push(vertex);
                        break;

                    case "v"://dy
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (angles && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(angles[i]);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.z += segment.values[0];
                        _verticesRaw.push(vertex);
                        break;

                    case "h"://dx
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (angles && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(angles[i]);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x += segment.values[0];
                        _verticesRaw.push(vertex);
                        break;

                    case "M"://x, y
                        _verticesRaw.push(new THREE.Vector3(segment.values[0], 0, segment.values[1]));
                        break;

                    case "L"://x, y
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (angles && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(angles[i]);
                        _verticesRaw.push(new THREE.Vector3(segment.values[0], 0, segment.values[1]));
                        break;

                    case "V"://y
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (angles && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(angles[i]);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.z = segment.values[0];
                        _verticesRaw.push(vertex);
                        break;

                    case "H"://x
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (angles && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(angles[i]);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x = segment.values[0];
                        _verticesRaw.push(vertex);
                        break;
                }
            }
        }
    }

    function parseSVG($outlines, $mountains, $valleys, $cuts, $triangulations, _mountainAngles, _valleyAngles){

        var _verticesRaw = [];
        var _mountainsRaw = [];
        var _valleysRaw = [];
        var _outlinesRaw = [];
        var _cutsRaw = [];
        var _triangulationsRaw = [];

        parsePath(_verticesRaw, _outlinesRaw, $outlines);
        parsePath(_verticesRaw, _mountainsRaw, $mountains, _mountainAngles);
        parsePath(_verticesRaw, _valleysRaw, $valleys, _valleyAngles);
        parsePath(_verticesRaw, _cutsRaw, $cuts);
        parsePath(_verticesRaw, _triangulationsRaw, $triangulations);

        findIntersections(_verticesRaw, _outlinesRaw, _mountainsRaw, _valleysRaw, _cutsRaw, _triangulationsRaw);
        verticesRaw = _verticesRaw;
        outlinesRaw = _outlinesRaw;
        mountainsRaw = _mountainsRaw;
        valleysRaw = _valleysRaw;
        cutsRaw = _cutsRaw;
        triangulationsRaw = _triangulationsRaw;

        mergeVertices();

        var allEdges = outlines.concat(mountains).concat(valleys).concat(cuts).concat(triangulationsRaw);
        polygons = findPolygons(allEdges);
        var faces = triangulatePolys(polygons, allEdges);

        var allCreaseParams = getFacesAndVerticesForEdges(faces, allEdges);
        globals.model.buildModel(faces, vertices, allEdges, allCreaseParams);
    }

    function getFacesAndVerticesForEdges(faces, allEdges){
        var allCreaseParams = [];//face1Ind, vertInd, face2Ind, ver2Ind, edgeInd, angle
        for (var i=outlines.length;i<allEdges.length;i++){
            if (i>=outlines.length+mountains.length+valleys.length &&
                i<outlines.length+mountains.length+valleys.length+cuts.length) continue;
            var v1 = allEdges[i][0];
            var v2 = allEdges[i][1];
            var creaseParams = [];
            for (var j=0;j<faces.length;j++){
                var face = faces[j];
                var faceVerts = [face[0], face[1], face[2]];
                var v1Index = faceVerts.indexOf(v1);
                if (v1Index>=0){
                    var v2Index = faceVerts.indexOf(v2);
                    if (v2Index>=0){
                        creaseParams.push(j);
                        if (v2Index>v1Index) {
                            faceVerts.splice(v2Index, 1);
                            faceVerts.splice(v1Index, 1);
                        } else {
                            faceVerts.splice(v1Index, 1);
                            faceVerts.splice(v2Index, 1);
                        }
                        creaseParams.push(faceVerts[0]);
                        if (creaseParams.length == 4) {

                            if (v2Index-v1Index == 1 || v2Index-v1Index == -2) {
                                creaseParams = [creaseParams[2], creaseParams[3], creaseParams[0], creaseParams[1]];
                            }

                            creaseParams.push(i);
                            if (i<(outlines.length+mountains.length+valleys.length)){
                                var angle = allEdges[i][2];
                                creaseParams.push(angle);
                            } else {
                                creaseParams.push(0);
                            }
                            allCreaseParams.push(creaseParams);
                            break;
                        }
                    }
                }
            }
        }
        return allCreaseParams;
    }

    function mergeVertices(){

        vertices = verticesRaw.slice();

        var tolSq = globals.vertTol*globals.vertTol;
        var combined = [];
        var mergedVertices = [];
        var _weededVertices = vertices.slice();
        var js = [];
        for (var i=0;i<vertices.length;i++){
            js.push(i);
        }
        for (var i=vertices.length-1;i>=0;i--){
            var _combined = [];
            var indicesToRemove = [];
            for (var j=i-1;j>=0;j--){
                if ((_weededVertices[i].clone().sub(_weededVertices[j])).lengthSq()<tolSq){
                    _combined.push(js[j]);
                    indicesToRemove.push(j);
                }
            }
            var numCombined = _combined.length;
            if (numCombined>0){
                _combined.push(js[i]);
                mergedVertices.push(_weededVertices[i]);
                combined.push(_combined);
                _weededVertices.splice(i, 1);
                js.splice(i, 1);
                for (var k=0;k<numCombined;k++){
                    _weededVertices.splice(indicesToRemove[k], 1);
                    js.splice(indicesToRemove[k], 1);
                }
                i -= numCombined;
            }
        }

        if (_weededVertices.length > 0){
            alert("Some vertices are not fully connected, try increasing vertex merge tolerance");
            return;
        }

        outlines = outlinesRaw.slice();
        mountains = mountainsRaw.slice();
        valleys = valleysRaw.slice();
        cuts = cutsRaw.slice();
        triangulations = triangulationsRaw.slice();

        removeCombinedFromSet(combined, outlines);
        removeCombinedFromSet(combined, mountains);
        removeCombinedFromSet(combined, valleys);
        removeCombinedFromSet(combined, cuts);
        removeCombinedFromSet(combined, triangulations);
        vertices = mergedVertices;
    }

    function triangulatePolys(polygonData, allEdges, _vertices, shouldRotateFace){
        if (_vertices === undefined) _vertices = vertices;
        var polygons = polygonData[0];
        var polygonEdges = polygonData[1];
        var faces = [];
        for (var i=0;i<polygons.length;i++){

            var polygon = polygons[i];

            if (polygon.length == 4){
                faces.push([polygon[0], polygon[1], polygon[2]]);
                continue;
            }

            //check for quad and solve manually
            if (polygon.length == 5){
                var polyVert1 = _vertices[polygon[0]];
                var polyVert2 = _vertices[polygon[1]];
                var polyVert3 = _vertices[polygon[2]];
                var polyVert4 = _vertices[polygon[3]];
                var dist1 = (polyVert1.clone().sub(polyVert3)).lengthSq();
                var dist2 = (polyVert2.clone().sub(polyVert4)).lengthSq();
                if (dist2<dist1) {
                    allEdges.push([polygon[1], polygon[3]]);
                    faces.push([polygon[0], polygon[1], polygon[3]]);
                    faces.push([polygon[1], polygon[2], polygon[3]]);
                } else {
                    allEdges.push([polygon[0], polygon[2]]);
                    faces.push([polygon[0], polygon[1], polygon[2]]);
                    faces.push([polygon[0], polygon[2], polygon[3]]);
                }
                continue;
            }

            var polyVerts = [];
            if (shouldRotateFace){
                var vecA = _vertices[polygon[1]].clone().sub(_vertices[polygon[0]]);
                var vecB = _vertices[polygon[polygon.length-2]].clone().sub(_vertices[polygon[0]]);
                var translation = _vertices[polygon[0]];
                var normal = (vecA.cross(vecB)).normalize();
                var axis = ((new THREE.Vector3(0,1,0)).cross(normal)).normalize();
                var angle = -Math.acos((new THREE.Vector3(0,1,0)).dot(normal));
                for (var j=1;j<polygon.length;j++){
                    var vertex = _vertices[polygon[j]];
                    vertex = (vertex.clone().sub(translation)).applyAxisAngle(axis, angle);
                    polyVerts.push(vertex.x);
                    polyVerts.push(vertex.z);
                }
            } else {
                for (var j=1;j<polygon.length;j++){
                    var vertex = _vertices[polygon[j]];
                    polyVerts.push(vertex.x);
                    polyVerts.push(vertex.z);
                }
            }

            var triangles = earcut(polyVerts);
            for (var j=0;j<triangles.length;j+=3){
                var face = [polygon[triangles[j+2]], polygon[triangles[j+1]], polygon[triangles[j]]];
                var foundEdges = [false, false, false];//ab, bc, ca

                for (var k=0;k<polygonEdges[i].length;k++){
                    var edgeIndex = polygonEdges[i][k];
                    if (edgeIndex<0) edgeIndex = -edgeIndex-1;
                    var _edgeVertices = allEdges[edgeIndex];

                    var aIndex = _edgeVertices.indexOf(face[0]);
                    var bIndex = _edgeVertices.indexOf(face[1]);
                    var cIndex = _edgeVertices.indexOf(face[2]);

                    if (aIndex >= 0){
                        if (bIndex >= 0) {
                            foundEdges[0] = true;
                            continue;
                        }
                        if (cIndex >= 0) {
                            foundEdges[2] = true;
                            continue;
                        }
                    }
                    if (bIndex >= 0){
                        if (cIndex >= 0) {
                            foundEdges[1] = true;
                            continue;
                        }
                    }
                }

                for (var k=0;k<3;k++){
                    if (foundEdges[k]) continue;
                    if (k==0){
                        polygonEdges[i].push(allEdges.length);
                        allEdges.push([face[0], face[1]]);
                    } else if (k==1){
                        polygonEdges[i].push(allEdges.length);
                        allEdges.push([face[2], face[1]]);
                    } else if (k==2){
                        polygonEdges[i].push(allEdges.length);
                        allEdges.push([face[2], face[0]]);
                    }
                }

                faces.push(face);
            }
        }
        return faces;
    }

    function findPolygons(allEdges, _vertices){
        //collect all edges connected to vertices
        if (_vertices === undefined) _vertices = vertices;
        var vertEdges = [];
        for (var i=0;i<_vertices.length;i++){
            vertEdges.push([]);
            for (var j=0;j<allEdges.length;j++){
                if (allEdges[j][0] == i) vertEdges[i].push(j);
                if (allEdges[j][1] == i) vertEdges[i].push(j);
            }
            if (vertEdges[i].length < 2){//check that all vertices have at least two edges
                alert("Some vertices are not fully connected, try increasing vertex merge tolerance");
                return;
            }
        }

        //order edges ccw
        for (var i=0;i<vertEdges.length;i++){
            var vertex = _vertices[i];
            var thetas = [];
            for (var j=0;j<vertEdges[i].length;j++){
                var edgeIndex = vertEdges[i][j];
                var edge;
                if (allEdges[edgeIndex][0] != i) edge = _vertices[allEdges[edgeIndex][0]].clone();
                else edge = _vertices[allEdges[edgeIndex][1]].clone();
                edge.sub(vertex);

                //find angle of each edge
                thetas.push({theta: Math.atan2(edge.z, edge.x), edgeIndex:edgeIndex});//-PI to PI
            }
            thetas = _.sortBy(thetas, "theta");
            var sortedEdges = [];
            for (var j=0;j<vertEdges[i].length;j++) {
                sortedEdges.push(thetas[j].edgeIndex);
            }
            vertEdges[i] = sortedEdges;
        }


        var edgesDir1 = [];//vert lower index to vert higher index
        var edgesDir2 = [];//vert higher index to vert lower index
        for (var i=0;i<allEdges.length;i++){
            edgesDir1.push(false);
            edgesDir2.push(false);
        }
        var polygons = [];
        var polygonEdges = [];
        for (var i=0;i<_vertices.length;i++){
            var edges = vertEdges[i];
            for (var j=0;j<edges.length;j++){

                var _poly = [i];
                var _polyEdges = [];

                var edgeIndex = edges[j];
                var edgeVertices = allEdges[edgeIndex];
                var otherVertex = edgeVertices[0];
                if (otherVertex == i) otherVertex = edgeVertices[1];

                if (otherVertex>i) {
                    if (!edgesDir1[edgeIndex]){
                        _poly.push(otherVertex);
                        _polyEdges.push(edgeIndex);
                        _poly = findNextPolyVert(_poly, _polyEdges, edgeIndex, otherVertex, vertEdges, allEdges, edgesDir1, edgesDir2);
                        if (_poly) {
                            for (var k=0;k<_polyEdges.length;k++){
                                var index = _polyEdges[k];
                                if (index<0) {
                                    index = -index-1;
                                    edgesDir2[index] = true;
                                } else {
                                    edgesDir1[index] = true;
                                }
                            }
                            polygons.push(_poly);
                            polygonEdges.push(_polyEdges);
                        }
                    }
                } else {
                    if (!edgesDir2[edgeIndex]){
                        _poly.push(otherVertex);
                        _polyEdges.push(-edgeIndex-1);
                        _poly = findNextPolyVert(_poly, _polyEdges, edgeIndex, otherVertex, vertEdges, allEdges, edgesDir1, edgesDir2);
                        if (_poly) {
                            for (var k=0;k<_polyEdges.length;k++){
                                var index = _polyEdges[k];
                                if (index<0) {
                                    index = -index-1;
                                    edgesDir2[index] = true;
                                } else {
                                    edgesDir1[index] = true;
                                }
                            }
                            polygons.push(_poly);
                            polygonEdges.push(_polyEdges);
                        }
                    }
                }
            }
        }
        //remove boundary
        for (var i=polygonEdges.length-1;i>=0;i--){
            var containsInnerCrease = false;
            for (var j=0;j<polygonEdges[i].length;j++){
                var edgeIndex = polygonEdges[i][j];
                if (edgeIndex < 0) edgeIndex = -edgeIndex-1;
                if (edgeIndex>=outlines.length){
                    containsInnerCrease = true;
                    break;
                }
            }
            if (!containsInnerCrease) {
                polygons.splice(i,1);
                polygonEdges.splice(i,1);
            }
        }

        return [polygons, polygonEdges];
    }

    function findNextPolyVert(_poly, _polyEdges, fromEdge, vertIndex, vertEdges, allEdges, edgesDir1, edgesDir2){
        var edges = vertEdges[vertIndex];
        var index = edges.indexOf(fromEdge);
        if (index<0) console.warn("bad from index");
        index++;
        if (index>=edges.length) index = 0;

        var edgeIndex = edges[index];
        if (_polyEdges.indexOf(edgeIndex)>=0) return null;//cant traverse same edge twice in one poly
        var edgeVertices = allEdges[edgeIndex];
        var otherVertex = edgeVertices[0];
        if (otherVertex == vertIndex) otherVertex = edgeVertices[1];

        if (otherVertex>vertIndex) {
            if (!edgesDir1[edgeIndex]) {
                _poly.push(otherVertex);
                _polyEdges.push(edgeIndex);
                if (otherVertex == _poly[0]) return _poly;
                else return findNextPolyVert(_poly, _polyEdges, edgeIndex, otherVertex, vertEdges, allEdges, edgesDir1, edgesDir2);
            } else return null;
        }

        if (!edgesDir2[edgeIndex]){
            _poly.push(otherVertex);
            _polyEdges.push(-edgeIndex-1);
            if (otherVertex == _poly[0]) return _poly;
            else return findNextPolyVert(_poly, _polyEdges, edgeIndex, otherVertex, vertEdges, allEdges, edgesDir1, edgesDir2);
        }
        return null;
    }


    function removeCombinedFromSet(combined, set){
        for (var j=0;j<set.length;j++){
            for (var i=0;i<combined.length;i++){
                if (combined[i].indexOf(set[j][0]) >= 0) {
                    set[j][0] = i;
                    break;
                }
            }
            for (var i=0;i<combined.length;i++) {
                if (combined[i].indexOf(set[j][1]) >= 0) {
                    set[j][1] = i;
                    break;
                }
            }
        }
    }

    function findIntersections(_verticesRaw, _outlinesRaw, _mountainsRaw, _valleysRaw, _cutsRaw, _triangulationsRaw){
        findIntersectionsInSets(_verticesRaw, _outlinesRaw, _mountainsRaw);
        findIntersectionsInSets(_verticesRaw, _outlinesRaw, _valleysRaw);
        findIntersectionsInSets(_verticesRaw, _outlinesRaw, _cutsRaw);
        findIntersectionsInSets(_verticesRaw, _outlinesRaw, _triangulationsRaw);
        findIntersectionsInSets(_verticesRaw, _mountainsRaw, _valleysRaw);
        findIntersectionsInSets(_verticesRaw, _mountainsRaw, _cutsRaw);
        findIntersectionsInSets(_verticesRaw, _mountainsRaw, _triangulationsRaw);
        findIntersectionsInSets(_verticesRaw, _valleysRaw, _cutsRaw);
        findIntersectionsInSets(_verticesRaw, _valleysRaw, _triangulationsRaw);
        findIntersectionsInSets(_verticesRaw, _cutsRaw, _triangulationsRaw);
    }

    function findIntersectionsInSets(_verticesRaw, set1, set2){
        for (var i=set1.length-1;i>=0;i--){
            for (var j=set2.length-1;j>=0;j--){
                var v1 = _verticesRaw[set1[i][0]];
                var v2 = _verticesRaw[set1[i][1]];
                var v3 = _verticesRaw[set2[j][0]];
                var v4 = _verticesRaw[set2[j][1]];
                var data = line_intersect(v1, v2, v3, v4);
                if (data) {
                    var d1 = getDistFromEnd(data.t1, v1, v2);
                    var d2 = getDistFromEnd(data.t2, v3, v4);
                    if (d1 === null || d2 === null) continue;
                    var seg1Int = d1>globals.vertTol;
                    var seg2Int = d2>globals.vertTol;
                    if (!seg1Int && !seg2Int) continue;

                    var vertIndex = _verticesRaw.length;
                    _verticesRaw.push(data.intersection);

                    if (seg1Int){
                        set1.splice(i+1, 0, [vertIndex, set1[i][0], set1[i][2]]);
                        set1.splice(i+1, 0, [vertIndex, set1[i][1], set1[i][2]]);
                        set1.splice(i, 1);
                        i++;
                        if (j==0) i++;
                    }
                    if (seg2Int){
                        set2.splice(j+1, 0, [vertIndex, set2[j][0], set2[i][2]]);
                        set2.splice(j+1, 0, [vertIndex, set2[j][1], set2[i][2]]);
                        set2.splice(j, 1);
                        j += 2;
                    }
                }
            }
        }
    }

    function getDistFromEnd(t, v1, v2){
        if (t>0.5) t = 1-t;
        var length = (v2.clone().sub(v1)).length();
        var dist = t*length;
        if (dist < -globals.vertTol) return null;
        if (dist > length+globals.vertTol) return null;
        return dist;
    }

    //http://paulbourke.net/geometry/pointlineplane/
    function line_intersect(v1, v2, v3, v4) {
        var x1 = v1.x;
        var y1 = v1.z;
        var x2 = v2.x;
        var y2 = v2.z;
        var x3 = v3.x;
        var y3 = v3.z;
        var x4 = v4.x;
        var y4 = v4.z;

        var ua, ub, denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
        if (denom == 0) {
            return null;
        }
        ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3))/denom;
        ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3))/denom;
        return {
            intersection: new THREE.Vector3(x1 + ua*(x2 - x1), 0, y1 + ua*(y2 - y1)),
            t1: ua,
            t2: ub
        };
    }

    function saveSVG(){
        if (globals.extension == "fold"){
            //todo solve for crease pattern
            globals.warn("No crease pattern available for FOLD format.");
            return;
        }
        var serializer = new XMLSerializer();
        var source = serializer.serializeToString(document.getElementById("mySVG"));
        var svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
        var svgUrl = URL.createObjectURL(svgBlob);
        var downloadLink = document.createElement("a");
        downloadLink.href = svgUrl;
        downloadLink.download =  globals.filename + ".svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    function getAllEdges(){
        return {
            mountains: mountains,
            valleys: valleys,
            outlines: outlines,
            cuts: cuts,
            triangulations: triangulations
        }
    }

    function getPolygons(){
        return polygons[0];
    }

    return {
        loadSVG: loadSVG,
        saveSVG: saveSVG,
        getFacesAndVerticesForEdges: getFacesAndVerticesForEdges,
        triangulatePolys: triangulatePolys,
        getAllEdges: getAllEdges,
        getPolygons: getPolygons
    }
}