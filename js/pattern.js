/**
 * Created by amandaghassaei on 2/25/17.
 */

function initPattern(globals){

    var object3D = new THREE.Object3D();
    globals.threeView.sceneAddModel(object3D);
    // var intersections = new THREE.Object3D();
    // object3D.add(intersections);

    var verticesRaw = [];//list of vertex3's
    //refs to vertex indices
    var mountainsRaw = [];
    var valleysRaw = [];
    var outlinesRaw = [];
    var cutsRaw = [];

    var vertices = [];//list of vertex3's (after merging)
    //refs to vertex indices
    var mountains = [];
    var valleys = [];
    var outlines = [];
    var cuts = [];

    var SVGloader = new THREE.SVGLoader();

    function loadSVG(url, callback){
        SVGloader.load(url, callback, function(){}, function(error){
            alert("Error loading SVG: " + url);
            console.log(error);
        });
    }

    loadSVG("/assets/Tessellations/miura-ori.svg", function(svg){
        var _$svg = $(svg);

        //format all lines
        var $paths = _$svg.children("path");
        $paths.css({fill:"none", 'stroke-width':3, 'stroke-dasharray':"none"});

        var $outlines = $paths.filter(function(){
            var stroke = $(this).attr("stroke").toLowerCase();
            return stroke == "#000000" || stroke == "#000";
        });
        // $outlines.css({fill:'#ffffff'});

        var $mountains = $paths.filter(function(){
            var stroke = $(this).attr("stroke").toLowerCase();
            return stroke == "#ff0000" || stroke == "#f00";
        });
        $mountains.css({'stroke-dasharray':'12, 6, 3, 6'});

        var $valleys = $paths.filter(function(){
            var stroke = $(this).attr("stroke").toLowerCase();
            return stroke == "#0000ff" || stroke == "#00f";
        });
        $valleys.css({'stroke-dasharray':'7, 6, 7, 6'});

        var $cuts = $paths.filter(function(){
            var stroke = $(this).attr("stroke").toLowerCase();
            return stroke == "#00ff00" || stroke == "#0f0";
        });

        var $svg = $('<svg version="1.1" viewBox="'+_$svg.attr("viewBox")+'" id="mySVG" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> </svg>');
        $svg.append($outlines);
        $svg.append($mountains);
        $svg.append($valleys);
        $svg.append($cuts);

        $("#svgViewer").html($svg);

        parseSVG($outlines, $mountains, $valleys, $cuts);
    });

    function parsePath(_verticesRaw, _segmentsRaw, $paths){
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
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x += segment.values[0];
                        vertex.z += segment.values[1];
                        _verticesRaw.push(vertex);
                        break;

                    case "v"://dy
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.z += segment.values[0];
                        _verticesRaw.push(vertex);
                        break;

                    case "h"://dx
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x += segment.values[0];
                        _verticesRaw.push(vertex);
                        break;

                    case "M"://x, y
                        _verticesRaw.push(new THREE.Vector3(segment.values[0], 0, segment.values[1]));
                        break;

                    case "L"://x, y
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        _verticesRaw.push(new THREE.Vector3(segment.values[0], 0, segment.values[1]));
                        break;

                    case "V"://y
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.z = segment.values[0];
                        _verticesRaw.push(vertex);
                        break;

                    case "H"://x
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x = segment.values[0];
                        _verticesRaw.push(vertex);
                        break;
                }
            }
        }
    }

    function parseSVG($outlines, $mountains, $valleys, $cuts){

        var _verticesRaw = [];
        var _mountainsRaw = [];
        var _valleysRaw = [];
        var _outlinesRaw = [];
        var _cutsRaw = [];

        parsePath(_verticesRaw, _outlinesRaw, $outlines);
        parsePath(_verticesRaw, _mountainsRaw, $mountains);
        parsePath(_verticesRaw, _valleysRaw, $valleys);
        parsePath(_verticesRaw, _cutsRaw, $cuts);

        findIntersections(_verticesRaw, _outlinesRaw, _mountainsRaw, _valleysRaw, _cutsRaw);
        verticesRaw = _verticesRaw;
        outlinesRaw = _outlinesRaw;
        mountainsRaw = _mountainsRaw;
        valleysRaw = _valleysRaw;
        cutsRaw = _cutsRaw;

        mergeVertices();
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

        removeCombinedFromSet(combined, outlines);
        removeCombinedFromSet(combined, mountains);
        removeCombinedFromSet(combined, valleys);
        removeCombinedFromSet(combined, cuts);


        vertices = mergedVertices;

        drawPattern(triangulatePolys(findPolygons()));
    }

    function triangulatePolys(polygons){
        var faces = [];
        for (var i=0;i<polygons.length;i++){
            var polyVerts = [];
            for (var j=1;j<polygons[i].length;j++){
                var vertex = vertices[polygons[i][j]];
                polyVerts.push(vertex.x);
                polyVerts.push(vertex.z);
            }
            var triangles = earcut(polyVerts);
            for (var j=0;j<triangles.length;j+=3){
                var face = new THREE.Face3(polygons[i][triangles[j]], polygons[i][triangles[j+1]], polygons[i][triangles[j+2]]);
                faces.push(face);
            }
        }
        return faces;
    }

    function findPolygons(){

        var allEdges = outlines.concat(mountains).concat(valleys).concat(cuts);

        //collect all edges connected to vertices
        var vertEdges = [];
        for (var i=0;i<vertices.length;i++){
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
            var vertex = vertices[i];
            var thetas = [];
            for (var j=0;j<vertEdges[i].length;j++){
                var edgeIndex = vertEdges[i][j];
                var edge;
                if (allEdges[edgeIndex][0] != i) edge = vertices[allEdges[edgeIndex][0]].clone();
                else edge = vertices[allEdges[edgeIndex][1]].clone();
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
        for (var i=0;i<vertices.length;i++){
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
                if (polygonEdges[i][j]>=outlines.length){
                    containsInnerCrease = true;
                    break;
                }
            }
            if (!containsInnerCrease) {
                polygons.splice(i,1);
            }
        }

        return polygons;
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

    function findIntersections(_verticesRaw, _outlinesRaw, _mountainsRaw, _valleysRaw, _cutsRaw){
        findIntersectionsInSets(_verticesRaw, _outlinesRaw, _mountainsRaw);
        findIntersectionsInSets(_verticesRaw, _outlinesRaw, _valleysRaw);
        findIntersectionsInSets(_verticesRaw, _outlinesRaw, _cutsRaw);
        findIntersectionsInSets(_verticesRaw, _mountainsRaw, _valleysRaw);
        findIntersectionsInSets(_verticesRaw, _mountainsRaw, _cutsRaw);
        findIntersectionsInSets(_verticesRaw, _valleysRaw, _cutsRaw);
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
                        set1.splice(i+1, 0, [vertIndex, set1[i][0]]);
                        set1.splice(i+1, 0, [vertIndex, set1[i][1]]);
                        set1.splice(i, 1);
                        i++;
                        if (j==0) i++;
                    }
                    if (seg2Int){
                        set2.splice(j+1, 0, [vertIndex, set2[j][0]]);
                        set2.splice(j+1, 0, [vertIndex, set2[j][1]]);
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

    function drawPattern(faces){
        object3D.children = [];

        var geo = new THREE.Geometry();
        geo.vertices = vertices;
        geo.faces = faces;
        geo.computeVertexNormals();
        var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({side:THREE.DoubleSide, color:0xffffff}));
        object3D.add(mesh);

        object3D.add(new THREE.LineSegments(makeGeoFromSVGSegments(outlines),
            new THREE.LineBasicMaterial({color: 0x000000, linewidth: 4})));
        object3D.add(new THREE.LineSegments(makeGeoFromSVGSegments(mountains),
            new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 4})));
        object3D.add(new THREE.LineSegments(makeGeoFromSVGSegments(valleys),
            new THREE.LineBasicMaterial({color: 0x0000ff, linewidth: 4})));
        var bounds = new THREE.Box3().setFromObject(object3D);
        var avg = (bounds.min.add(bounds.max)).multiplyScalar(0.5);
        object3D.position.set(-avg.x, 0, -avg.z);
    }

    function makeGeoFromSVGSegments(segments){
        var geometry = new THREE.Geometry;
        for (var i=0;i<segments.length;i++){
            geometry.vertices.push(vertices[segments[i][0]].clone());
            geometry.vertices.push(vertices[segments[i][1]].clone());
        }
        return geometry;
    }

    return {
        loadSVG: loadSVG
    }
}