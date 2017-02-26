/**
 * Created by amandaghassaei on 2/25/17.
 */

function initPattern(globals){

    var object3D = new THREE.Object3D();
    globals.threeView.sceneAddModel(object3D);

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

        var $valleys = $paths.filter(function(){
            var stroke = $(this).attr("stroke").toLowerCase();
            return stroke == "#0000ff" || stroke == "#00f";
        });

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

        findIntersections(_verticesRaw, _outlinesRaw, _mountainsRaw, _valleysRaw);
        verticesRaw = _verticesRaw;
        outlinesRaw = _outlinesRaw;
        mountainsRaw = _mountainsRaw;
        valleysRaw = _valleysRaw;
        cutsRaw = _cutsRaw;

        mergeVertices(globals.vertTol);
        drawPattern();
    }

    function mergeVertices(tol){
        vertices = verticesRaw;
        outlines = outlinesRaw;
        mountains = mountainsRaw;
        valleys = valleysRaw;
        cuts = cutsRaw;
    }

    function findIntersections(_verticesRaw, _outlinesRaw, _mountainsRaw, _valleysRaw){
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