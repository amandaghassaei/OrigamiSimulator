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

    loadSVG("/assets/Tessellations/miura-ori-dashed.svg", function(svg){
        var _$svg = $(svg);

        //format all lines
        var $paths = _$svg.children("path");
        $paths.css({fill:"none", 'stroke-width':3, 'stroke-dasharray':"none"});

        var $outlines = $paths.filter(function(){
            var stroke = $(this).attr("stroke").toLowerCase();
            return stroke == "#000000" || stroke == "#000";
        });

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
                var type = segment.type.toLowerCase();
                switch(type){

                    case "m":
                        _verticesRaw.push(new THREE.Vector3(segment.values[0], 0, segment.values[1]));
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
        drawPattern();
    }

    function mergeVertices(){

        vertices = verticesRaw.slice();

        var tolSq = globals.vertTol*globals.vertTol;
        var combined = [];
        var mergedVertices = [];
        var diff = 1;
        for (var i=vertices.length-1;i>=0;i--){
            var _combined = [];
            for (var j=i-diff;j>=0;j--){
                if ((vertices[i].clone().sub(vertices[j])).lengthSq()<tolSq){
                    _combined.push(j);
                }
            }
            var numCombined = _combined.length;
            if (numCombined>0){
                _combined.push(i);
                mergedVertices.push(vertices[i]);
                combined.push(_combined);
                for (var k=0;k<numCombined-1;k++){
                    vertices.splice(_combined[k], 1);
                }
                diff -= numCombined
            }
        }
        console.log(combined.length);

        outlines = outlinesRaw.slice();
        mountains = mountainsRaw.slice();
        valleys = valleysRaw.slice();
        cuts = cutsRaw.slice();

        removeCombinedFromSet(combined, outlines);
        removeCombinedFromSet(combined, mountains);
        removeCombinedFromSet(combined, valleys);
        removeCombinedFromSet(combined, cuts);

        vertices = mergedVertices;
    }

    function removeCombinedFromSet(combined, set){
        for (var i=0;i<combined.length;i++){
            for (var j=0;j<set.length;j++){
                if (combined[i].indexOf(set[j][0]) >= 0) set[j][0] = i;
                if (combined[i].indexOf(set[j][1]) >= 0) set[j][1] = i;
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

    function drawPattern(){
        object3D.children = [];
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