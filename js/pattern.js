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
        delete foldData.vertices_vertices;
        delete foldData.faces_vertices;
    }


    var verticesRaw = [];//list of vertex3's
    //refs to vertex indices
    var mountainsRaw = [];
    var valleysRaw = [];
    var bordersRaw = [];
    var cutsRaw = [];
    var triangulationsRaw = [];
    var hingesRaw = [];

    var mountains = [];
    var valleys = [];
    var borders = [];
    var cuts = [];
    var hinges = [];
    var triangulations = [];
    var polygons = [];

    var badColors = [];//store any bad colors in svg file to show user

    var SVGloader = new THREE.SVGLoader();

    //filter for svg parsing
    function borderFilter(){
        var stroke = getStroke($(this));
        return typeForStroke(stroke) == "border";
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
                return ($(obj)[0].style.stroke).toLowerCase();
            }
            return null;
        }
        return stroke.toLowerCase();
    }

    function typeForStroke(stroke){
        if (stroke == "#000000" || stroke == "#000" || stroke == "black" || stroke == "rgb(0, 0, 0)") return "border";
        if (stroke == "#ff0000" || stroke == "#f00" || stroke == "red" || stroke == "rgb(255, 0, 0)") return "mountain";
        if (stroke == "#0000ff" || stroke == "#00f" || stroke == "blue" || stroke == "rgb(0, 0, 255)") return "valley";
        if (stroke == "#00ff00" || stroke == "#0f0" || stroke == "green" || stroke == "rgb(0, 255, 0)") return "cut";
        if (stroke == "#ffff00" || stroke == "#ff0" || stroke == "yellow" || stroke == "rgb(255, 255, 0)") return "triangulation";
        if (stroke == "#ff00ff" || stroke == "#f0f" || stroke == "magenta" || stroke == "rgb(255, 0, 255)") return "hinge";
        badColors.push(stroke);
        return null;
    }

    function colorForAssignment(assignment){
        if (assignment == "B") return "#000";//border
        if (assignment == "M") return "#f00";//mountain
        if (assignment == "V") return "#00f";//valley
        if (assignment == "C") return "#0f0";//cut
        if (assignment == "F") return "#ff0";//facet
        if (assignment == "U") return "#f0f";//hinge
        return "#0ff"
    }
    function opacityForAngle(angle){
        if (angle === null) return 1;
        return Math.abs(angle)/Math.PI;
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
            bordersRaw = [];
            mountainsRaw = [];
            valleysRaw = [];
            cutsRaw = [];
            triangulationsRaw = [];
            hingesRaw = [];

            findType(verticesRaw, bordersRaw, borderFilter, $paths, $lines, $rects, $polygons, $polylines);
            findType(verticesRaw, mountainsRaw, mountainFilter, $paths, $lines, $rects, $polygons, $polylines);
            findType(verticesRaw, valleysRaw, valleyFilter, $paths, $lines, $rects, $polygons, $polylines);
            // findType(verticesRaw, cutsRaw, cutFilter, $paths, $lines, $rects, $polygons, $polylines);
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

            parseSVG(verticesRaw, bordersRaw, mountainsRaw, valleysRaw, cutsRaw, triangulationsRaw);

            //find max and min vertices
            var max = new THREE.Vector3(-Infinity,-Infinity,-Infinity);
            var min = new THREE.Vector3(Infinity,Infinity,Infinity);
            for (var i=0;i<foldData.vertices_coords.length;i++){
                var vertex = new THREE.Vector3(foldData.vertices_coords[i][0], foldData.vertices_coords[i][1], foldData.vertices_coords[i][2]);
                max.max(vertex);
                min.min(vertex);
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
            border.multiplyScalar(scale);
            min.sub(border);
            max.add(border.multiplyScalar(2));
            var viewBoxTxt = min.x + " " + min.z + " " + max.x + " " + max.z;

            var ns = 'http://www.w3.org/2000/svg';
            var svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', viewBoxTxt);
            for (var i=0;i<foldData.edges_vertices.length;i++){
                var line = document.createElementNS(ns, 'line');
                var edge = foldData.edges_vertices[i];
                var vertex = foldData.vertices_coords[edge[0]];
                line.setAttribute('stroke', colorForAssignment(foldData.edges_assignment[i]));
                line.setAttribute('opacity', opacityForAngle(foldData.edges_foldAngles[i]));
                line.setAttribute('x1', vertex[0]);
                line.setAttribute('y1', vertex[2]);
                vertex = foldData.vertices_coords[edge[1]];
                line.setAttribute('x2', vertex[0]);
                line.setAttribute('y2', vertex[2]);
                line.setAttribute('stroke-width', strokeWidth);
                svg.appendChild(line);
            }
            document.getElementById("svgViewer").appendChild(svg);

            },
            function(){},
            function(error){
                globals.warn("Error loading SVG " + url + " : " + error);
                console.warn(error);
        });
    }

    function parseSVG(_verticesRaw, _bordersRaw, _mountainsRaw, _valleysRaw, _cutsRaw, _triangulationsRaw, _hingesRaw){

        clearFold();
        _.each(_verticesRaw, function(vertex){
            foldData.vertices_coords.push([vertex.x, vertex.z]);
        });
        _.each(_bordersRaw, function(edge){
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
        // foldData = FOLD.filter.subdivideCrossingEdges_vertices(foldData, globals.vertTol);//find intersections and add vertices/edges
        foldData = findIntersections(foldData, globals.vertTol);
        foldData = FOLD.convert.edges_vertices_to_vertices_vertices_unsorted(foldData);
        foldData = removeStrayVertices(foldData);//delete stray anchors
        removeRedundantVertices(foldData, 0.01);//remove vertices that split edge
        foldData.vertices_vertices = FOLD.convert.sort_vertices_vertices(foldData);
        foldData = FOLD.convert.vertices_vertices_to_faces_vertices(foldData);
        foldData = reverseFaceOrder(foldData);//set faces to counter clockwise

        // var foldData = triangulatePolys(foldData);

        for (var i=0;i<foldData.vertices_coords.length;i++){
            var vertex = foldData.vertices_coords[i];
            foldData.vertices_coords[i] = [vertex[0], 0, vertex[1]];//make vertices_coords 3d
        }
        mountains = FOLD.filter.mountainEdges(foldData);
        valleys = FOLD.filter.valleyEdges(foldData);
        borders = FOLD.filter.boundaryEdges(foldData);
        hinges = FOLD.filter.unassignedEdges(foldData);
        triangulations = FOLD.filter.flatEdges(foldData);

        $("#numMtns").html("(" + mountains.length + ")");
        $("#numValleys").html("(" + valleys.length + ")");
        $("#numFacets").html("(" + triangulations.length + ")");
        $("#numBoundary").html("(" + borders.length + ")");
        $("#numPassive").html("(" + hinges.length + ")");

        var allCreaseParams = getFacesAndVerticesForEdges(foldData);//todo precompute vertices_faces

        globals.model.buildModel(foldData, allCreaseParams, getAllEdges());
    }

    function reverseFaceOrder(fold){
        for (var i=0;i<fold.faces_vertices.length;i++){
            fold.faces_vertices[i].reverse()
        }
        return fold;
    }

    function getFacesAndVerticesForEdges(fold){
        var allCreaseParams = [];//face1Ind, vertInd, face2Ind, ver2Ind, edgeInd, angle
        var faces = fold.faces_vertices;
        for (var i=0;i<fold.edges_vertices.length;i++){
            var assignment = fold.edges_assignment[i];
            if (assignment == "B" || assignment == "U" || assignment == "C") continue;
            var edge = fold.edges_vertices[i];
            var v1 = edge[0];
            var v2 = edge[1];
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
                            var angle = fold.edges_foldAngles[i];
                            if (angle === null) {
                                console.warn("shouldn't be here");
                                continue;
                            }
                            creaseParams.push(angle);
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
            if (vertex_vertices.length != 2) {
                old2new.push(newIndex++);
                continue;
            }
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
                mergeEdge(fold, vertex_vertices[0], i, vertex_vertices[1])
            } else old2new.push(newIndex++);
        }
        if (numRedundant == 0) return fold;
        console.warn(numRedundant + " redundant vertices found");
        fold = FOLD.filter.remapField(fold, 'vertices', old2new);
        // _.each(fold.vertices_vertices, function(vertex_vertices){
        //     for (var i=vertex_vertices.length-1;i>=0;i--){
        //         if (vertex_vertices[i] === null) vertex_vertices.splice(i,1);
        //     }
        // });
        //todo fix vertices_vertices w/o recompute
        fold.vertices_vertices = null;
        fold = FOLD.convert.edges_vertices_to_vertices_vertices_unsorted(fold);
        return fold;
    }

    function mergeEdge(fold, v1, v2, v3){
        var angleAvg = 0;
        var edgeAssignment = null;
        for (var i=fold.edges_vertices.length-1;i>=0;i--){
            var edge = fold.edges_vertices[i];
            if (edge.indexOf(v2)>=0 && (edge.indexOf(v1) >= 0 || edge.indexOf(v3) >= 0)){
                if (edgeAssignment === null) edgeAssignment = fold.edges_assignment[i];
                else if (edgeAssignment != fold.edges_assignment[i]) console.warn("different edge assignments");
                angleAvg += fold.edges_foldAngles[i];
                fold.edges_vertices.splice(i, 1);
                fold.edges_assignment.splice(i, 1);
                fold.edges_foldAngles.splice(i, 1);
            }
        }
        fold.edges_vertices.push([v1, v3]);
        fold.edges_assignment.push(edgeAssignment);
        fold.edges_foldAngles.push(angleAvg/2);
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

    function findIntersections(fold, tol){
        var vertices = fold.vertices_coords;
        var edges = fold.edges_vertices;
        var foldAngles = fold.edges_foldAngles;
        var assignments = fold.edges_assignment;
        for (var i=edges.length-1;i>=0;i--){
            for (var j=i-1;j>=0;j--){
                var v1 = makeVector2(vertices[edges[i][0]]);
                var v2 = makeVector2(vertices[edges[i][1]]);
                var v3 = makeVector2(vertices[edges[j][0]]);
                var v4 = makeVector2(vertices[edges[j][1]]);
                var data = line_intersect(v1, v2, v3, v4);
                if (data) {
                    var length1 = (v2.clone().sub(v1)).length();
                    var length2 = (v4.clone().sub(v3)).length();
                    var d1 = getDistFromEnd(data.t1, length1, tol);
                    var d2 = getDistFromEnd(data.t2, length2, tol);
                    if (d1 === null || d2 === null) continue;//no crossing

                    var seg1Int = d1>tol && d1<length1-tol;
                    var seg2Int = d2>tol && d2<length2-tol;
                    if (!seg1Int && !seg2Int) continue;//intersects at endpoints only

                    var vertIndex;
                    if (seg1Int && seg2Int){
                        vertIndex = vertices.length;
                        vertices.push([data.intersection.x,  data.intersection.y]);
                    } else if (seg1Int){
                        if (d2<=tol) vertIndex = edges[j][0];
                        else vertIndex = edges[j][1];
                    } else {
                        if (d1<=tol) vertIndex = edges[i][0];
                        else vertIndex = edges[i][1];
                    }

                    if (seg1Int){
                        var foldAngle = foldAngles[i];
                        var assignment = assignments[i];
                        edges.splice(i, 1, [vertIndex, edges[i][0]], [vertIndex, edges[i][1]]);
                        foldAngles.splice(i, 1, foldAngle, foldAngle);
                        assignments.splice(i, 1, assignment, assignment);
                        i++;
                    }
                    if (seg2Int){
                        var foldAngle = foldAngles[j];
                        var assignment = assignments[j];
                        edges.splice(j, 1, [vertIndex, edges[j][0]], [vertIndex, edges[j][1]]);
                        foldAngles.splice(j, 1, foldAngle, foldAngle);
                        assignments.splice(j, 1, assignment, assignment);
                        j++;
                        i++;
                    }
                }
            }
        }
        fold = FOLD.filter.collapseNearbyVertices(fold, tol);
        fold = FOLD.filter.removeLoopEdges(fold);//remove edges that points to same vertex
        return fold;
    }

    function makeVector2(v){
        return new THREE.Vector2(v[0], v[1]);
    }

    function getDistFromEnd(t, length, tol){
        var dist = t*length;
        if (dist < -tol) return null;
        if (dist > length+tol) return null;
        return dist;
    }

    //http://paulbourke.net/geometry/pointlineplane/
    function line_intersect(v1, v2, v3, v4) {
        var x1 = v1.x;
        var y1 = v1.y;
        var x2 = v2.x;
        var y2 = v2.y;
        var x3 = v3.x;
        var y3 = v3.y;
        var x4 = v4.x;
        var y4 = v4.y;

        var ua, ub, denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
        if (denom == 0) {
            return null;
        }
        ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3))/denom;
        ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3))/denom;
        return {
            intersection: new THREE.Vector2(x1 + ua*(x2 - x1), y1 + ua*(y2 - y1)),
            t1: ua,
            t2: ub
        };
    }

    function getAllEdges(){
        return {
            mountains: mountains,
            valleys: valleys,
            borders: borders,
            cuts: cuts,
            triangulations: triangulations
        }
    }

    function getPolygons(){//todo export fold complete
        return foldData.faces_vertices;
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