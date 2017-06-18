/**
 * Created by amandaghassaei on 2/25/17.
 */

function initPattern(globals){

    var FOLD = require('fold');

    var foldData = {};
    clearFold();

    function clearFold(){
        foldData.vertices_coords = [];
        foldData.edges_vertices = [];
        foldData.edges_assignment = [];//B = boundary, M = mountain, V = valley, C = cut, F = facet, H/U = hinge
        foldData.edges_foldAngles = [];//target angles
        foldData.faces_vertices = [];
    }


    var verticesRaw = [];//list of vertex3's
    //refs to vertex indices
    var mountainsRaw = [];
    var valleysRaw = [];
    var outlinesRaw = [];
    var cutsRaw = [];
    var triangulationsRaw = [];
    var hingesRaw = [];

    var vertices = [];//list of vertex3's (after processing)
    //refs to vertex indices
    var mountains = [];
    var valleys = [];
    var outlines = [];
    var cuts = [];
    var triangulations = [];
    var polygons = [];

    var badColors = [];//store any bad colors in svg file to show user

    var SVGloader = new THREE.SVGLoader();

    //filter for svg parsing
    function outlineFilter(){
        var stroke = getStroke($(this));
        return typeForStroke(stroke) == "outline";
    }
    function mountainFilter(){
        var $this = $(this);
        var stroke = getStroke($this);
        if (typeForStroke(stroke) == "mountain"){
            var opacity = getOpacity($this);
            this.targetAngle = -opacity*Math.PI;
            return true;
        }
        return false;
    }
    function valleyFilter(){
        var $this = $(this);
        var stroke = getStroke($this);
        if (typeForStroke(stroke) == "valley"){
            var opacity = getOpacity($this);
            this.targetAngle = opacity*Math.PI;
            return true;
        }
        return false;
    }
    function cutFilter(){
        var stroke = getStroke($(this));
        return typeForStroke(stroke) == "cut";
    }
    function triangulationFilter(){
        var stroke = getStroke($(this));
        return typeForStroke(stroke) == "triangulation";
    }
    function hingeFilter(){
        var stroke = getStroke($(this));
        return typeForStroke(stroke) == "hinge";
    }

    function getOpacity(obj){
        var opacity = obj.attr("opacity");
        if (opacity === undefined) {
            if (obj.attr("style") && $(obj)[0].style.opacity) {
                opacity = $(obj)[0].style.opacity;
            }
            if (opacity === undefined){
                opacity = obj.attr("stroke-opacity");
                if (opacity === undefined) {
                    if (obj.attr("style") && $(obj)[0].style["stroke-opacity"]) {
                        opacity = $(obj)[0].style["stroke-opacity"];
                    }
                }
            }
        }
        opacity = parseFloat(opacity);
        if (isNaN(opacity)) return 1;
        return opacity;
    }

    function getStroke(obj){
        var stroke = obj.attr("stroke");
        if (stroke === undefined) {
            if (obj.attr("style") && $(obj)[0].style.stroke) {
                return $(obj)[0].style.stroke;
            }
            return null;
        }
        return stroke.toLowerCase();
    }

    function typeForStroke(stroke){
        if (stroke == "#000000" || stroke == "#000" || stroke == "black" || stroke == "rgb(0, 0, 0)") return "outline";
        if (stroke == "#ff0000" || stroke == "#f00" || stroke == "red" || stroke == "rgb(255, 0, 0)") return "mountain";
        if (stroke == "#0000ff" || stroke == "#00f" || stroke == "blue" || stroke == "rgb(0, 0, 255)") return "valley";
        if (stroke == "#00ff00" || stroke == "#0f0" || stroke == "green" || stroke == "rgb(0, 255, 0)") return "cut";
        if (stroke == "#ffff00" || stroke == "#ff0" || stroke == "yellow" || stroke == "rgb(255, 255, 0)") return "triangulation";
        if (stroke == "#ff00ff" || stroke == "#f0f" || stroke == "magenta" || stroke == "rgb(255, 0, 255)") return "hinge";
        badColors.push(stroke);
        return null;
    }

    function findType(_verticesRaw, _segmentsRaw, filter, $paths, $lines, $rects, $polygons, $polylines){
        parsePath(_verticesRaw, _segmentsRaw, $paths.filter(filter));
        parseLine(_verticesRaw, _segmentsRaw, $lines.filter(filter));
        parseRect(_verticesRaw, _segmentsRaw, $rects.filter(filter));
        parsePolygon(_verticesRaw, _segmentsRaw, $polygons.filter(filter));
        parsePolyline(_verticesRaw, _segmentsRaw, $polylines.filter(filter));
    }

    function applyTransformation(vertex, transformations){
        if (transformations == undefined) return;
        transformations = transformations.baseVal;
        for (var i=0;i<transformations.length;i++){
            var t = transformations[i];
            var M = [[t.matrix.a, t.matrix.c, t.matrix.e], [t.matrix.b, t.matrix.d, t.matrix.f], [0,0,1]];
            var out = numeric.dot(M, [vertex.x, vertex.z, 1]);
            vertex.x = out[0];
            vertex.z = out[1];
        }
    }

    function parsePath(_verticesRaw, _segmentsRaw, $elements){
        for (var i=0;i<$elements.length;i++){
            var path = $elements[i];
            var pathVertices = [];
            var segments = path.getPathData();
            for (var j=0;j<segments.length;j++){
                var segment = segments[j];
                var type = segment.type;
                switch(type){

                    case "m"://dx, dy
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x += segment.values[0];
                        vertex.z += segment.values[1];
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "l"://dx, dy
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x += segment.values[0];
                        vertex.z += segment.values[1];
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "v"://dy
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.z += segment.values[0];
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "h"://dx
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x += segment.values[0];
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "M"://x, y
                        var vertex = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "L"://x, y
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                        _verticesRaw.push(new THREE.Vector3(segment.values[0], 0, segment.values[1]));
                        pathVertices.push(vertex);
                        break;

                    case "V"://y
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.z = segment.values[0];
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "H"://x
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                        var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                        vertex.x = segment.values[0];
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;
                }
            }
            for (var j=0;j<pathVertices.length;j++){
                applyTransformation(pathVertices[j], path.transform);
            }
        }
    }

    function parseLine(_verticesRaw, _segmentsRaw, $elements){
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];
            _verticesRaw.push(new THREE.Vector3(element.x1.baseVal.value, 0, element.y1.baseVal.value));
            _verticesRaw.push(new THREE.Vector3(element.x2.baseVal.value, 0, element.y2.baseVal.value));
            _segmentsRaw.push([_verticesRaw.length-2, _verticesRaw.length-1]);
            if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-1].push(element.targetAngle);
            applyTransformation(_verticesRaw[_verticesRaw.length-2], element.transform);
            applyTransformation(_verticesRaw[_verticesRaw.length-1], element.transform);
        }
    }

    function parseRect(_verticesRaw, _segmentsRaw, $elements){
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];
            var x = element.x.baseVal.value;
            var y = element.y.baseVal.value;
            var width = element.width.baseVal.value;
            var height = element.height.baseVal.value;
            _verticesRaw.push(new THREE.Vector3(x, 0, y));
            _verticesRaw.push(new THREE.Vector3(x+width, 0, y));
            _verticesRaw.push(new THREE.Vector3(x+width, 0, y+height));
            _verticesRaw.push(new THREE.Vector3(x, 0, y+height));
            _segmentsRaw.push([_verticesRaw.length-4, _verticesRaw.length-3]);
            _segmentsRaw.push([_verticesRaw.length-3, _verticesRaw.length-2]);
            _segmentsRaw.push([_verticesRaw.length-2, _verticesRaw.length-1]);
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length-4]);
            for (var j=1;j<=4;j++){
                if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-j].push(element.targetAngle);
                applyTransformation(_verticesRaw[_verticesRaw.length-j], element.transform);
            }
        }
    }

    function parsePolygon(_verticesRaw, _segmentsRaw, $elements){
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];
            for (var j=0;j<element.points.length;j++){
                _verticesRaw.push(new THREE.Vector3(element.points[j].x, 0, element.points[j].y));
                applyTransformation(_verticesRaw[_verticesRaw.length-1], element.transform);

                if (j<element.points.length-1) _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                else _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length-element.points.length]);

                if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-1].push(element.targetAngle);
            }
        }
    }

    function parsePolyline(_verticesRaw, _segmentsRaw, $elements){
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];
            for (var j=0;j<element.points.length;j++){
                _verticesRaw.push(new THREE.Vector3(element.points[j].x, 0, element.points[j].y));
                applyTransformation(_verticesRaw[_verticesRaw.length-1], element.transform);
                if (j>0) _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length-2]);
                if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-1].push(element.targetAngle);
            }
        }
    }

    function loadSVG(url){
        SVGloader.load(url, function(svg){
            var _$svg = $(svg);

            badColors = [];

            //format all appropriate svg elements
            var $paths = _$svg.children("path");
            $paths.css({fill:"none", 'stroke-dasharray':"none"});
            var $lines = _$svg.children("line");
            $lines.css({fill:"none", 'stroke-dasharray':"none"});
            var $rects = _$svg.children("rect");
            $rects.css({fill:"none", 'stroke-dasharray':"none"});
            var $polygons = _$svg.children("polygon");
            $polygons.css({fill:"none", 'stroke-dasharray':"none"});
            var $polylines = _$svg.children("polyline");
            $polylines.css({fill:"none", 'stroke-dasharray':"none"});

            verticesRaw = [];
            outlinesRaw = [];
            mountainsRaw = [];
            valleysRaw = [];
            cutsRaw = [];
            triangulationsRaw = [];
            hingesRaw = [];

            findType(verticesRaw, outlinesRaw, outlineFilter, $paths, $lines, $rects, $polygons, $polylines);
            findType(verticesRaw, mountainsRaw, mountainFilter, $paths, $lines, $rects, $polygons, $polylines);
            findType(verticesRaw, valleysRaw, valleyFilter, $paths, $lines, $rects, $polygons, $polylines);
            findType(verticesRaw, cutsRaw, cutFilter, $paths, $lines, $rects, $polygons, $polylines);
            findType(verticesRaw, triangulationsRaw, triangulationFilter, $paths, $lines, $rects, $polygons, $polylines);
            findType(verticesRaw, hingesRaw, hingeFilter, $paths, $lines, $rects, $polygons, $polylines);

            if (badColors.length>0){
                badColors = _.uniq(badColors);
                var string = "<br/>Some objects found with the following stroke colors:<br/><br/>";
                _.each(badColors, function(color){
                    string += "<span style='background:" + color + "' class='colorSwatch'></span>" + color + "<br/>";
                });
                string += "<br/> These objects were ignored.<br/>  Please check that your file is set up correctly, <br/>" +
                    "see <b>File > File Import Tips</b> for more information.<br/><br/>";
                globals.warn(string);
            }

            parseSVG(verticesRaw, outlinesRaw, mountainsRaw, valleysRaw, cutsRaw, triangulationsRaw);

            //find max and min vertices
            var max = new THREE.Vector3(-Infinity,-Infinity,Infinity);
            var min = new THREE.Vector3(Infinity,Infinity,Infinity);
            for (var i=0;i<vertices.length;i++){
                max.max(vertices[i]);
                min.min(vertices[i]);
            }
            if (min.x === Infinity){
                if (badColors.length == 0) globals.warn("no geometry found in file");
                return;
            }
            max.sub(min);
            var border = new THREE.Vector3(0.1, 0, 0.1);
            var scale = max.x;
            if (max.z < scale) scale = max.z;

            var strokeWidth = scale/300;
            // $mountains.css({'stroke-dasharray': strokeWidth*6 + ', ' + strokeWidth*3 + ', ' + strokeWidth*1.5 + ', ' + strokeWidth*3});
            // $valleys.css({'stroke-dasharray': strokeWidth*4 + ', ' + strokeWidth*3 + ', ' + strokeWidth*4 + ', ' + strokeWidth*3});
            $paths.css({'stroke-width':strokeWidth});

            border.multiplyScalar(scale);
            min.sub(border);
            max.add(border.multiplyScalar(2));
            var viewBoxTxt = min.x + " " + min.z + " " + max.x + " " + max.z;
            var $svg = $('<svg version="1.1" viewBox="' + viewBoxTxt + '" id="mySVG" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> </svg>');
            //todo only show montains, valleys, hinges, triangulations, etc
                $svg.append($paths);
            $svg.append($lines);
            $svg.append($rects);
            $svg.append($polygons);
            $svg.append($polylines);

            $("#svgViewer").html($svg);

            },
            function(){},
            function(error){
                globals.warn("Error loading SVG: " + url);
                console.log(error);
        });
    }

    function parseSVG(_verticesRaw, _outlinesRaw, _mountainsRaw, _valleysRaw, _cutsRaw, _triangulationsRaw, _hingesRaw){

        // findIntersections(_verticesRaw, _outlinesRaw, _mountainsRaw, _valleysRaw, _cutsRaw, _triangulationsRaw);


		//FOLD.convert.edges_vertices_to_faces_vertices(fold)

		//FOLD.filter.removeLoopEdges
        clearFold();
        _.each(_verticesRaw, function(vertex){
            foldData.vertices_coords.push([vertex.x, vertex.z]);
        });
        _.each(_outlinesRaw, function(edge){
            foldData.edges_vertices.push([edge[0], edge[1]]);
            foldData.edges_assignment.push("B");
            foldData.edges_foldAngles.push(null);
        });
        _.each(_mountainsRaw, function(edge){
            foldData.edges_vertices.push([edge[0], edge[1]]);
            foldData.edges_assignment.push("M");
            foldData.edges_foldAngles.push(edge[2]);
        });
        _.each(_valleysRaw, function(edge){
            foldData.edges_vertices.push([edge[0], edge[1]]);
            foldData.edges_assignment.push("V");
            foldData.edges_foldAngles.push(edge[2]);
        });
        _.each(_triangulationsRaw, function(edge){
            foldData.edges_vertices.push([edge[0], edge[1]]);
            foldData.edges_assignment.push("F");
            foldData.edges_foldAngles.push(0);
        });
        _.each(_hingesRaw, function(edge){
            foldData.edges_vertices.push([edge[0], edge[1]]);
            foldData.edges_assignment.push("U");
            foldData.edges_foldAngles.push(0);
        });
        //todo cuts

        foldData = FOLD.filter.collapseNearbyVertices(foldData, globals.vertTol);
        foldData = FOLD.filter.removeLoopEdges(foldData);//remove edges that points to same vertex
        foldData = FOLD.filter.subdivideCrossingEdges_vertices(foldData, globals.vertTol);//find intersections ad add vertices/edges
        foldData = FOLD.convert.edges_vertices_to_vertices_vertices_unsorted(foldData);
        foldData = removeStrayVertices(foldData);//delete stray anchors
        removeRedundantVertices(foldData, 0.01);//remove vertices that split edge

        polygons = findPolygons(allEdges);
        var faces = triangulatePolys(polygons, allEdges);

        $("#numMtns").html("(" + FOLD.filter.mountainEdges(foldData).length + ")");
        $("#numValleys").html("(" + FOLD.filter.valleyEdges(foldData).length + ")");
        $("#numFacets").html("(" + FOLD.filter.flatEdges(foldData) + ")");
        $("#numBoundary").html("(" + FOLD.filter.boundaryEdges(foldData).length + ")");
        $("#numPassive").html("(" + FOLD.filter.unassignedEdges(foldData).length + ")");

        var allCreaseParams = getFacesAndVerticesForEdges(faces, allEdges);

        var allTypes = [outlines.length, mountains.length, valleys.length, cuts.length];

        globals.model.buildModel(faces, vertices, allEdges, allCreaseParams, allTypes);
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

    function removeRedundantVertices(fold, epsilon){

        var old2new = [];
        var numRedundant = 0;
        var newIndex = 0;
        for (var i=0;i<fold.vertices_vertices.length;i++){
            var vertex_vertices = fold.vertices_vertices[i];
            if (vertex_vertices.length != 2) continue;
            var vertex_coord = fold.vertices_coords[i];
            var neighbor0 = fold.vertices_coords[vertex_vertices[0]];
            var neighbor1 = fold.vertices_coords[vertex_vertices[1]];
            var threeD = vertex_coord.length == 3;
            var vec0 = [neighbor0[0]-vertex_coord[0], neighbor0[1]-vertex_coord[1]];
            var vec1 = [neighbor1[0]-vertex_coord[0], neighbor1[1]-vertex_coord[1]];
            var magSqVec0 = vec0[0]*vec0[0]+vec0[1]*vec0[1];
            var magSqVec1 = vec1[0]*vec1[0]+vec1[1]*vec1[1];
            if (threeD){
                vec0.push(neighbor0[2]-vertex_coord[2]);
                vec1.push(neighbor1[2]-vertex_coord[2]);
                magSqVec0 += vec0[2]*vec0[2];
                magSqVec1 += vec1[2]*vec1[2];
            }
            var dot = vec0[0]*vec1[0]+vec0[1]*vec1[1];
            if (threeD) dot += vec0[2]*vec1[2];
            dot /= Math.sqrt(magSqVec0*magSqVec1);
            if (Math.abs(dot + 1.0)<epsilon){
                numRedundant++;
                old2new.push(null);
            } else old2new.push(newIndex++);
        }
        if (numRedundant == 0) return fold;
        console.warn(numRedundant + " redundant vertices found");
        return FOLD.filter.remapField(fold, 'vertices', old2new);
    }

    function removeStrayVertices(fold){
        if (!fold.vertices_vertices) {
            console.warn("compute vertices_vertices first");
            fold = FOLD.convert.edges_vertices_to_vertices_vertices_unsorted(fold);
        }
        var numStrays = 0;
        var old2new = [];
        var newIndex = 0;
        for (var i=0;i<fold.vertices_vertices.length;i++){
            if (fold.vertices_vertices[i] === undefined || fold.vertices_vertices[i].length==0) {
                numStrays++;
                old2new.push(null);
            } else old2new.push(newIndex++);
        }
        if (numStrays == 0) return fold;
        console.warn(numStrays+ " stray vertices found");
        return FOLD.filter.remapField(fold, 'vertices', old2new);
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
                for (var j=0;j<polygon.length-1;j++){
                    var vertex = _vertices[polygon[j]];
                    vertex = (vertex.clone().sub(translation)).applyAxisAngle(axis, angle);
                    polyVerts.push(vertex.x);
                    polyVerts.push(vertex.z);
                }
            } else {
                for (var j=0;j<polygon.length-1;j++){
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