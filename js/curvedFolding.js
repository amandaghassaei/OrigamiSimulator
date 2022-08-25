function initCurvedFolding(globals) {

    var FOLD = require('fold');

    var foldData = {};
    var rawFold = {};

    function clearFold(){
        foldData.vertices_coords = [];
        foldData.edges_vertices = [];
        foldData.edges_assignment = [];//B = boundary, M = mountain, V = valley, C = cut, F = facet, U = hinge
        foldData.edges_foldAngle = [];//target angles
        delete foldData.vertices_vertices;
        delete foldData.faces_vertices;
        delete foldData.vertices_edges;
        rawFold = {};
    }

    var verticesRaw = [];
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
    var hinges = [];
    var triangulations = [];

    var badColors = [];//store any bad colors in svg file to show user

    function clearAll(){

        clearFold();
        verticesRaw = [];

        mountainsRaw = [];
        valleysRaw = [];
        bordersRaw = [];
        cutsRaw = [];
        triangulationsRaw = [];
        hingesRaw = [];

        mountains = [];
        valleys = [];
        borders = [];
        hinges = [];
        triangulations = [];

        badColors = [];
    }

    clearAll();

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
            this.targetAngle = -opacity*180;
            return true;
        }
        return false;
    }
    function valleyFilter(){
        var $this = $(this);
        var stroke = getStroke($this);
        if (typeForStroke(stroke) == "valley"){
            var opacity = getOpacity($this);
            this.targetAngle = opacity*180;
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
        // Check rendered style first (most browsers, supporting CSS styling),
        // then opacity attribute, then opacity:... spec in style attribute.
        // Ditto for stroke-opacity.  Both default to 1 (full opacity).
        // If both are present, they get multiplied together.
        var opacity = obj.css('opacity') || obj.attr('opacity') ||
            (obj[0].style && obj[0].style.opacity);
        var strokeOpacity = obj.css('stroke-opacity') ||
            obj.attr('stroke-opacity') ||
            (obj[0].style && obj[0].style.strokeOpacity);
        opacity = parseFloat(opacity);
        strokeOpacity = parseFloat(strokeOpacity);
        if (isNaN(opacity)) {
            opacity = 1;
        }
        if (isNaN(strokeOpacity)) {
            opacity = 1;
        }
        return opacity * strokeOpacity;
    }

    function getStroke(obj){
        // Check rendered style first (most browsers, supporting CSS styling),
        // then stroke attribute, then stroke:... spec in style attribute.
        var stroke = obj.css('stroke') || obj.attr("stroke") ||
            (obj[0].style && obj[0].style.stroke);
        if (stroke === undefined) {
            return null;
        }
        stroke = stroke.replace(/\s/g,'');//remove all whitespace
        return stroke.toLowerCase();
    }

    function typeForStroke(stroke){
        if (stroke == "#000000" || stroke == "#000" || stroke == "black"    || stroke == "rgb(0,0,0)"       ) return "border";
        if (stroke == "#ff0000" || stroke == "#f00" || stroke == "red"      || stroke == "rgb(255,0,0)"     ) return "mountain";
        if (stroke == "#0000ff" || stroke == "#00f" || stroke == "blue"     || stroke == "rgb(0,0,255)"     ) return "valley";
        if (stroke == "#00ff00" || stroke == "#0f0" || stroke == "green"    || stroke == "rgb(0,255,0)"     ) return "cut";
        if (stroke == "#ffff00" || stroke == "#ff0" || stroke == "yellow"   || stroke == "rgb(255,255,0)"   ) return "triangulation";
        if (stroke == "#ff00ff" || stroke == "#f0f" || stroke == "magenta"  || stroke == "rgb(255,0,255)"   ) return "hinge";
        badColors.push(stroke);
        return null;
    }

    function colorForAssignment(assignment){
        if (assignment == "B") return "#000";//border
        if (assignment == "M") return "#f00";//mountain
        if (assignment == "CM") return "#f00";//curved mountain
        if (assignment == "V") return "#00f";//valley
        if (assignment == "CV") return "#00f";//curved valley
        if (assignment == "C") return "#0f0";//cut
        if (assignment == "F") return "#ff0";//facet
        if (assignment == "U") return "#f0f";//hinge
        return "#0ff"
    }
    function opacityForAngle(angle, assignment){
        if (angle === null || assignment == "F") return 1;
        return Math.abs(angle)/180;
    }

    function findType(_verticesRaw, _segmentsRaw, filter, $paths, $lines, $rects, $polygons, $polylines, $ellipses, $circles){
        parsePath(_verticesRaw, _segmentsRaw, $paths.filter(filter));
        parseLine(_verticesRaw, _segmentsRaw, $lines.filter(filter));
        parseRect(_verticesRaw, _segmentsRaw, $rects.filter(filter));
        parsePolygon(_verticesRaw, _segmentsRaw, $polygons.filter(filter));
        parsePolyline(_verticesRaw, _segmentsRaw, $polylines.filter(filter));
        parseEllipse(_verticesRaw, _segmentsRaw, $ellipses.filter(filter));
        parseCircle(_verticesRaw, _segmentsRaw, $circles.filter(filter));
    }

    function applyTransformation(vertex, element){
        var transformations = [];
        var ancestor = element;
        do {
            if (ancestor.transform)
                transformations.push.apply(transformations, ancestor.transform.baseVal);
            ancestor = ancestor.parentNode;
        } while (ancestor && ancestor.nodeName !== 'svg');
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
            if (path === undefined || path.getPathData === undefined){//mobile problem
                var elm = '<div id="coverImg" ' +
                  'style="background: url(assets/doc/crane.gif) no-repeat center center fixed;' +
                    '-webkit-background-size: cover;' +
                    '-moz-background-size: cover;' +
                    '-o-background-size: cover;' +
                    'background-size: cover;">'+
                  '</div>';
                $(elm).appendTo($("body"));
                $("#noSupportModal").modal("show");
                console.warn("path parser not supported");
                return;
            }
            var startVertex = null;
            var segments = path.getPathData();
            let $path = $(path);
            let originV, startV, endV, c1, c2, lastSegment, lastType;
            for (var j=0;j<segments.length;j++){
                var segment = segments[j];
                var type = segment.type;
                switch(type){

                    case "m"://dx, dy
                        var vertex;
                        if (j === 0){
                            // "If a relative moveto (m) appears as the first
                            // element of the path, then it is treated as a
                            // pair of absolute coordinates"
                            // [https://www.w3.org/TR/SVG/paths.html#PathDataMovetoCommands]
                            vertex = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                        } else {
                            vertex = _verticesRaw[_verticesRaw.length-1].clone();
                            vertex.x += segment.values[0];
                            vertex.z += segment.values[1];
                        }
                        startVertex = _verticesRaw.length;
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "l"://dx, dy
                        if (typeForStroke(getStroke($path)) == "border") {
                            divPathl(segment, _segmentsRaw, _verticesRaw, path, pathVertices);
                        } else {
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                            var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                            vertex.x += segment.values[0];
                            vertex.z += segment.values[1];
                            _verticesRaw.push(vertex);
                            pathVertices.push(vertex);
                        }
                        break;

                    case "v"://dy
                        if (typeForStroke(getStroke($path)) == "border") {
                            divPathv(segment, _segmentsRaw, _verticesRaw, path, pathVertices);
                        } else {
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                            var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                            vertex.z += segment.values[0];
                            _verticesRaw.push(vertex);
                            pathVertices.push(vertex);
                        }
                        break;

                    case "h"://dx
                        if (typeForStroke(getStroke($path)) == "border") {
                            divPathh(segment, _segmentsRaw, _verticesRaw, path, pathVertices);
                        } else {
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                            var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                            vertex.x += segment.values[0];
                            _verticesRaw.push(vertex);
                            pathVertices.push(vertex);
                        }
                        break;

                    case "M"://x, y
                        var vertex = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                        startVertex = _verticesRaw.length;
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "L"://x, y
                        if (typeForStroke(getStroke($path)) == "border") {
                            divPathL(segment, _segmentsRaw, _verticesRaw, path, pathVertices);
                        } else {
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                            var vertex = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                            _verticesRaw.push(vertex);
                            pathVertices.push(vertex);
                        }
                        break;

                    case "V"://y
                        if (typeForStroke(getStroke($path)) == "border") {
                            divPathV(segment, _segmentsRaw, _verticesRaw, path, pathVertices);
                        } else {    
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                            var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                            vertex.z = segment.values[0];
                            _verticesRaw.push(vertex);
                            pathVertices.push(vertex);
                        }
                        break;

                    case "H"://x
                        if (typeForStroke(getStroke($path)) == "border") {
                            divPathH(segment, _segmentsRaw, _verticesRaw, path, pathVertices);
                        } else {
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                            var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                            vertex.x = segment.values[0];
                            _verticesRaw.push(vertex);
                            pathVertices.push(vertex);
                        }
                        break;

                    case "z":
                    case "Z":
                        if (typeForStroke(getStroke($path)) == "border") {
                            if (startVertex != null) {
                                divPathZ(_segmentsRaw, _verticesRaw, path, pathVertices, startVertex);
                                startVertex = null;
                            }
                        } else {
                            if (startVertex != null) {
                                _segmentsRaw.push([_verticesRaw.length-1, startVertex]);
                                startVertex = null;
                            }
                        }
                        break;
                    
                    case "c":
                    case "C":
                        originV = _verticesRaw[_verticesRaw.length-1].clone();
                        startV = new THREE.Vector3(0, 0, 0);
                        endV = new THREE.Vector3(segment.values[4], 0, segment.values[5]);
                        c1 = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                        c2 = new THREE.Vector3(segment.values[2], 0, segment.values[3]);
                        if (type === "c") {
                            divPathC(startV, endV, c1, c2, _segmentsRaw, _verticesRaw, path, pathVertices, originV, type);
                        } else {
                            divPathC(originV, endV, c1, c2, _segmentsRaw, _verticesRaw, path, pathVertices, originV, type);
                        }
                        if (typeForStroke(getStroke($path)) == "mountain" || typeForStroke(getStroke($path)) == "valley") {
                            _segmentsRaw.push(["C"]);
                        }
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                        var vertex;
                        if (type === "c") {
                            vertex = new THREE.Vector3(originV.x+endV.x, 0, originV.z+endV.z);
                        } else {
                            vertex = new THREE.Vector3(endV.x, 0, endV.z);
                        }
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "s":
                    case "S":
                        lastSegment = segments[j-1];
                        lastType = lastSegment.type;
                        if (lastType === "S" || lastType === "s" || lastType === "C" || lastType === "c") {
                            if (lastType === "S" || lastType === "C") {
                                originV = _verticesRaw[_verticesRaw.length-1].clone();
                                if (type === "S") {
                                    c1 = new THREE.Vector3(endV.x * 2 - c2.x, 0, endV.z * 2 - c2.z);
                                } else {
                                    c1 = new THREE.Vector3(endV.x * 2 - c2.x - originV.x, 0, endV.z * 2 - c2.z - originV.z);
                                }
                            } else {
                                if (type === "S") {
                                    c1 = new THREE.Vector3(endV.x * 2 - c2.x + originV.x, 0, endV.z * 2 - c2.z + originV.z);
                                    originV = _verticesRaw[_verticesRaw.length-1].clone();
                                } else {
                                    c1 = new THREE.Vector3(endV.x * 2 - c2.x + originV.x, 0, endV.z * 2 - c2.z + originV.z);
                                    originV = _verticesRaw[_verticesRaw.length-1].clone();
                                    c1.x = c1.x - originV.x;
                                    c1.z = c1.z - originV.z;
                                }
                            }
                            startV = new THREE.Vector3(0, 0, 0);
                            endV = new THREE.Vector3(segment.values[2], 0, segment.values[3]);
                            c2 = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                            if (type === "s") {
                                divPathC(startV, endV, c1, c2, _segmentsRaw, _verticesRaw, path, pathVertices, originV, "c");
                            } else {
                                divPathC(originV, endV, c1, c2, _segmentsRaw, _verticesRaw, path, pathVertices, originV, "C");
                            }
                            if (typeForStroke(getStroke($path)) == "mountain" || typeForStroke(getStroke($path)) == "valley") {
                                _segmentsRaw.push(["C"]);
                            }
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                            var vertex;
                            if (type === "s") {
                                vertex = new THREE.Vector3(originV.x+endV.x, 0, originV.z+endV.z);
                            } else {
                                vertex = new THREE.Vector3(endV.x, 0, endV.z);
                            }
                            _verticesRaw.push(vertex);
                            pathVertices.push(vertex);
                        } else {
                            originV = _verticesRaw[_verticesRaw.length-1];
                            startV = new THREE.Vector3(0, 0, 0);
                            endV = new THREE.Vector3(segment.values[2], 0, segment.values[3]);
                            c1 = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                            if (type === "s") {
                                divPathQ(startV, endV, c1, _segmentsRaw, _verticesRaw, path, pathVertices, originV, "q");
                            } else {
                                divPathQ(originV, endV, c1, _segmentsRaw, _verticesRaw, path, pathVertices, originV, "Q");
                            }
                            if (typeForStroke(getStroke($path)) == "mountain" || typeForStroke(getStroke($path)) == "valley") {
                                _segmentsRaw.push(["C"]);
                            }
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                            var vertex;
                            if (type === "s") {
                                vertex = new THREE.Vector3(originV.x+endV.x, 0, originV.z+endV.z);
                            } else {
                                vertex = new THREE.Vector3(endV.x, 0, endV.z);
                            }
                            _verticesRaw.push(vertex);
                            pathVertices.push(vertex);
                        }
                        break;
                    
                    case "q":
                    case "Q":
                        originV = _verticesRaw[_verticesRaw.length-1];
                        startV = new THREE.Vector3(0, 0, 0);
                        endV = new THREE.Vector3(segment.values[2], 0, segment.values[3]);
                        c1 = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                        if (type === "q") {
                            divPathQ(startV, endV, c1, _segmentsRaw, _verticesRaw, path, pathVertices, originV, type);
                        } else {
                            divPathQ(originV, endV, c1, _segmentsRaw, _verticesRaw, path, pathVertices, originV, type);
                        }
                        if (typeForStroke(getStroke($path)) == "mountain" || typeForStroke(getStroke($path)) == "valley") {
                            _segmentsRaw.push(["C"]);
                        }
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                        var vertex;
                        if (type === "q") {
                            vertex = new THREE.Vector3(originV.x+endV.x, 0, originV.z+endV.z);
                        } else {
                            vertex = new THREE.Vector3(endV.x, 0, endV.z);
                        }
                        _verticesRaw.push(vertex);
                        pathVertices.push(vertex);
                        break;

                    case "t":
                    case "T":
                        lastSegment = segments[j-1];
                        lastType = lastSegment.type;
                        if (lastType === "Q" || lastType === "q" || lastType === "T" || lastType === "t") {
                            if (lastType === "Q" || lastType === "T") {
                                originV = _verticesRaw[_verticesRaw.length-1].clone();
                                const lastC1 = c1.clone();
                                if (type === "T") {
                                    c1 = new THREE.Vector3(endV.x * 2 - lastC1.x, 0, endV.z * 2 - lastC1.z);
                                } else {
                                    c1 = new THREE.Vector3(endV.x * 2 - lastC1.x - originV.x, 0, endV.z * 2 - lastC1.z - originV.z);
                                }
                            } else {
                                if (type === "T") {
                                    const lastC1 = c1.clone();
                                    c1 = new THREE.Vector3(endV.x * 2 - lastC1.x + originV.x, 0, endV.z * 2 - lastC1.z + originV.z);
                                    originV = _verticesRaw[_verticesRaw.length-1].clone();
                                } else {
                                    const lastC1 = c1.clone();
                                    c1 = new THREE.Vector3(endV.x * 2 - lastC1.x + originV.x, 0, endV.z * 2 - lastC1.z + originV.z);
                                    originV = _verticesRaw[_verticesRaw.length-1].clone();
                                    c1.x = c1.x - originV.x;
                                    c1.z = c1.z - originV.z;
                                }
                            }
                            startV = new THREE.Vector3(0, 0, 0);
                            endV = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                            if (type === "t") {
                                divPathQ(startV, endV, c1, _segmentsRaw, _verticesRaw, path, pathVertices, originV, "q");
                            } else {
                                divPathQ(originV, endV, c1, _segmentsRaw, _verticesRaw, path, pathVertices, originV, "Q");
                            }
                            if (typeForStroke(getStroke($path)) == "mountain" || typeForStroke(getStroke($path)) == "valley") {
                                _segmentsRaw.push(["C"]);
                            }
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                            var vertex;
                            if (type === "t") {
                                vertex = new THREE.Vector3(originV.x+endV.x, 0, originV.z+endV.z);
                            } else {
                                vertex = new THREE.Vector3(endV.x, 0, endV.z);
                            }
                            _verticesRaw.push(vertex);
                            pathVertices.push(vertex);
                        } else {
                            if (type === "t") {
                                if (typeForStroke(getStroke($path)) != "border") {
                                    _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                                    if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                                    var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                                    vertex.x += segment.values[0];
                                    vertex.z += segment.values[1];
                                    _verticesRaw.push(vertex);
                                    pathVertices.push(vertex);
                                } else {
                                    startV = _verticesRaw[_verticesRaw.length-1].clone();
                                    endV = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                                    const distance = Math.sqrt(Math.pow(endV.x, 2) + Math.pow(endV.z, 2));
                                    const n = Math.ceil(distance / globals.vertInt);
                                    if (n > 1) {
                                        for (let i = n - 1; i >= 0; i--) {
                                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                                            const vertex = new THREE.Vector3(startV.x+(i*0+(n-i)*endV.x)/n, 0, startV.z+(i*0+(n-i)*endV.z)/n);
                                            _verticesRaw.push(vertex);
                                            pathVertices.push(vertex);
                                        }
                                    } else {
                                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                                        const vertex = new THREE.Vector3(startV.x+endV.x, 0, startV.z+endV.z);
                                        _verticesRaw.push(vertex);
                                        pathVertices.push(vertex);
                                    }
                                }
                            } else {
                                if (typeForStroke(getStroke($path)) != "border") {
                                    _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                                    if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                                    var vertex = _verticesRaw[_verticesRaw.length-1].clone();
                                    vertex.x = segment.values[0];
                                    vertex.z = segment.values[1];
                                    _verticesRaw.push(vertex);
                                    pathVertices.push(vertex);
                                } else {
                                    startV = _verticesRaw[_verticesRaw.length-1].clone();
                                    endV = new THREE.Vector3(segment.values[0], 0, segment.values[1]);
                                    const distance = Math.sqrt(Math.pow(endV.x - startV.x, 2) + Math.pow(endV.z - startV.z, 2));
                                    const n = Math.ceil(distance / globals.vertInt);
                                    if (n > 1) {
                                        for (let i = n - 1; i >= 0; i--) {
                                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                                            if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                                            const vertex = new THREE.Vector3((i*startV.x+(n-i)*endV.x)/n, 0, (i*startV.z+(n-i)*endV.z)/n);
                                            _verticesRaw.push(vertex);
                                            pathVertices.push(vertex);
                                        }
                                    } else {
                                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                                        if (path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(path.targetAngle);
                                        const vertex = new THREE.Vector3(endV.x, 0, endV.z);
                                        _verticesRaw.push(vertex);
                                        pathVertices.push(vertex);
                                    }
                                }
                            }
                        }
                        break;

                    case "A":
                    case "a":
                        let svgpath = require('svgpath');
                        let pathDataString = "M " + _verticesRaw[_verticesRaw.length-1].x + " " + _verticesRaw[_verticesRaw.length-1].z + " " + type;
                        pathDataString += " ";
                        for (let index = 0; index < segment.values.length; index++) {
                            pathDataString += segment.values[index];
                            pathDataString += " ";
                        }
                        const output = svgpath(pathDataString).unarc();
                        for (let i = 1; i < output.segments.length; i++) {
                            let newSegment = new Object();
                            newSegment.type = output.segments[i][0];
                            newSegment.values = [];
                            for (let j = 1; j < output.segments[i].length; j++) {
                                newSegment.values.push(output.segments[i][j]);
                            }
                            segments.splice(j+i, 0, newSegment);
                        }
                        break;
                }
            }
            for (var j=0;j<pathVertices.length;j++){
                applyTransformation(pathVertices[j], path);
            }
        }
    }

    function divPathl(_segment, _segmentsRaw, _verticesRaw, _path, _pathVertices) {
        const startV = _verticesRaw[_verticesRaw.length-1].clone();
        const endV = new THREE.Vector3(_segment.values[0], 0, _segment.values[1]);
        const distance = Math.sqrt(Math.pow(endV.x, 2) + Math.pow(endV.z, 2));
        const n = Math.ceil(distance / globals.vertInt);
        if (n > 1) {
            for (let i = n - 1; i >= 0; i--) {
                _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
                const vertex = new THREE.Vector3(startV.x+(i*0+(n-i)*endV.x)/n, 0, startV.z+(i*0+(n-i)*endV.z)/n);
                _verticesRaw.push(vertex);
                _pathVertices.push(vertex);
            }
        } else {
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
            const vertex = new THREE.Vector3(startV.x+endV.x, 0, startV.z+endV.z);
            _verticesRaw.push(vertex);
            _pathVertices.push(vertex);
        }
    }

    function divPathL(_segment, _segmentsRaw, _verticesRaw, _path, _pathVertices) {
        const startV = _verticesRaw[_verticesRaw.length-1].clone();
        const endV = new THREE.Vector3(_segment.values[0], 0, _segment.values[1]);
        const distance = Math.sqrt(Math.pow(endV.x - startV.x, 2) + Math.pow(endV.z - startV.z, 2));
        const n = Math.ceil(distance / globals.vertInt);
        if (n > 1) {
            for (let i = n - 1; i >= 0; i--) {
                _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
                const vertex = new THREE.Vector3((i*startV.x+(n-i)*endV.x)/n, 0, (i*startV.z+(n-i)*endV.z)/n);
                _verticesRaw.push(vertex);
                _pathVertices.push(vertex);
            }
        } else {
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
            const vertex = new THREE.Vector3(endV.x, 0, endV.z);
            _verticesRaw.push(vertex);
            _pathVertices.push(vertex);
        }
    }

    function divPathv(_segment, _segmentsRaw, _verticesRaw, _path, _pathVertices) {
        const startV = _verticesRaw[_verticesRaw.length-1].clone();
        const endV = new THREE.Vector3(0, 0, _segment.values[0]);
        const distance = Math.sqrt(Math.pow(endV.x, 2) + Math.pow(endV.z, 2));
        const n = Math.ceil(distance / globals.vertInt);
        if (n > 1) {
            for (let i = n - 1; i >= 0; i--) {
                _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
                const vertex = new THREE.Vector3(startV.x+(i*0+(n-i)*endV.x)/n, 0, startV.z+(i*0+(n-i)*endV.z)/n);
                _verticesRaw.push(vertex);
                _pathVertices.push(vertex);
            }
        } else {
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
            const vertex = new THREE.Vector3(startV.x+endV.x, 0, startV.z+endV.z);
            _verticesRaw.push(vertex);
            _pathVertices.push(vertex);
        }
    }

    function divPathV(_segment, _segmentsRaw, _verticesRaw, _path, _pathVertices) {
        const startV = _verticesRaw[_verticesRaw.length-1].clone();
        const endV = new THREE.Vector3(startV.x, 0, _segment.values[0]);
        const distance = Math.sqrt(Math.pow(endV.x - startV.x, 2) + Math.pow(endV.z - startV.z, 2));
        const n = Math.ceil(distance / globals.vertInt);
        if (n > 1) {
            for (let i = n - 1; i >= 0; i--) {
                _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
                const vertex = new THREE.Vector3((i*startV.x+(n-i)*endV.x)/n, 0, (i*startV.z+(n-i)*endV.z)/n);
                _verticesRaw.push(vertex);
                _pathVertices.push(vertex);
            }
        } else {
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
            const vertex = new THREE.Vector3(endV.x, 0, endV.z);
            _verticesRaw.push(vertex);
            _pathVertices.push(vertex);
        }
    }

    function divPathh(_segment, _segmentsRaw, _verticesRaw, _path, _pathVertices) {
        const startV = _verticesRaw[_verticesRaw.length-1].clone();
        const endV = new THREE.Vector3(_segment.values[0], 0, 0);
        const distance = Math.sqrt(Math.pow(endV.x, 2) + Math.pow(endV.z, 2));
        const n = Math.ceil(distance / globals.vertInt);
        if (n > 1) {
            for (let i = n - 1; i >= 0; i--) {
                _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
                const vertex = new THREE.Vector3(startV.x+(i*0+(n-i)*endV.x)/n, 0, startV.z+(i*0+(n-i)*endV.z)/n);
                _verticesRaw.push(vertex);
                _pathVertices.push(vertex);
            }
        } else {
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
            const vertex = new THREE.Vector3(startV.x+endV.x, 0, startV.z+endV.z);
            _verticesRaw.push(vertex);
            _pathVertices.push(vertex);
        }
    }

    function divPathH(_segment, _segmentsRaw, _verticesRaw, _path, _pathVertices) {
        const startV = _verticesRaw[_verticesRaw.length-1].clone();
        const endV = new THREE.Vector3(_segment.values[0], 0, startV.z);
        const distance = Math.sqrt(Math.pow(endV.x - startV.x, 2) + Math.pow(endV.z - startV.z, 2));
        const n = Math.ceil(distance / globals.vertInt);
        if (n > 1) {
            for (let i = n - 1; i >= 0; i--) {
                _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
                const vertex = new THREE.Vector3((i*startV.x+(n-i)*endV.x)/n, 0, (i*startV.z+(n-i)*endV.z)/n);
                _verticesRaw.push(vertex);
                _pathVertices.push(vertex);
            }
        } else {
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
            const vertex = new THREE.Vector3(endV.x, 0, endV.z);
            _verticesRaw.push(vertex);
            _pathVertices.push(vertex);
        }
    }

    function divPathZ(_segmentsRaw, _verticesRaw, _path, _pathVertices, _startVertex) {
        const startV = _verticesRaw[_verticesRaw.length-1].clone();
        const endV = _verticesRaw[_startVertex].clone();
        const distance = Math.sqrt(Math.pow(endV.x - startV.x, 2) + Math.pow(endV.z - startV.z, 2));
        const n = Math.ceil(distance / globals.vertInt);
        if (n > 1) {
            for (let i = n - 1; i >= 1; i--) {
                _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
                const vertex = new THREE.Vector3((i*startV.x+(n-i)*endV.x)/n, 0, (i*startV.z+(n-i)*endV.z)/n);
                _verticesRaw.push(vertex);
                _pathVertices.push(vertex);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _startVertex]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
        } else {
            _segmentsRaw.push([_verticesRaw.length-1, _startVertex]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
        }
    }

    function divPathC(_startV, _endV, _c1, _c2, _segmentsRaw, _verticesRaw, _path, _pathVertices, _originV, _type) {
        let a, b, midV, d;
        if (_endV.x - _startV.x == 0) {
            midV = calcMidVC(_startV, _endV, _c1, _c2, 0.5);
            d = Math.abs(midV.x - _endV.x);
        } else {
            a = (_endV.z - _startV.z)/(_endV.x - _startV.x);
            b = _endV.z - a*_endV.x;
            midV = calcMidVC(_startV, _endV, _c1, _c2, 0.5);
            d = Math.abs(a*midV.x + (-1)*midV.z + b)/Math.sqrt(a*a+1);
        }
        if (globals.apprCurve < d || globals.vertInt * globals.vertInt < dist2(_startV, _endV)) {
            const newC1 = new THREE.Vector3((_startV.x+_c1.x)*0.5, 0, (_startV.z+_c1.z)*0.5);
            const newC2 = new THREE.Vector3((_c1.x+_c2.x)*0.5, 0, (_c1.z+_c2.z)*0.5);
            const newC3 = new THREE.Vector3((_c2.x+_endV.x)*0.5, 0, (_c2.z+_endV.z)*0.5);
            const newC4 = new THREE.Vector3((newC1.x+newC2.x)*0.5, 0, (newC1.z+newC2.z)*0.5);
            const newC5 = new THREE.Vector3((newC2.x+newC3.x)*0.5, 0, (newC2.z+newC3.z)*0.5);
            divPathC(_startV, midV, newC1, newC4, _segmentsRaw, _verticesRaw, _path, _pathVertices, _originV, _type);
            if (typeForStroke(getStroke($(_path))) == "mountain" || typeForStroke(getStroke($(_path))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
            let vertex;
            if (_type === "c") {
                vertex = new THREE.Vector3(_originV.x+midV.x, 0, _originV.z+midV.z);
            } else {
                vertex = new THREE.Vector3(midV.x, 0, midV.z);
            }
            _verticesRaw.push(vertex);
            _pathVertices.push(vertex);
            divPathC(midV, _endV, newC5, newC3, _segmentsRaw, _verticesRaw, _path, _pathVertices, _originV, _type);
        }
    }

    function dist2(v1, v2) {
        return (v1.x-v2.x)*(v1.x-v2.x)+(v1.z-v2.z)*(v1.z-v2.z);
    }

    function calcMidVC(_startV, _endV, _c1, _c2, _t) {
        const u = 1-_t;
        return new THREE.Vector3(u*u*u*_startV.x + 3*_t*u*u*_c1.x + 3*_t*_t*u*_c2.x + _t*_t*_t*_endV.x, 0, u*u*u*_startV.z + 3*_t*u*u*_c1.z + 3*_t*_t*u*_c2.z + _t*_t*_t*_endV.z);
    }

    function divPathQ(_startV, _endV, _c1, _segmentsRaw, _verticesRaw, _path, _pathVertices, _originV, _type) {
        let a, b, midV, d;
        if (_endV.x - _startV.x == 0) {
            midV = calcMidVQ(_startV, _endV, _c1, 0.5);
            d = Math.abs(midV.x - _endV.x);
        } else {
            a = (_endV.z - _startV.z)/(_endV.x - _startV.x);
            b = _endV.z - a*_endV.x;
            midV = calcMidVQ(_startV, _endV, _c1, 0.5);
            d = Math.abs(a*midV.x + (-1)*midV.z + b)/Math.sqrt(a*a+1);
        }
        if (globals.apprCurve < d || globals.vertInt * globals.vertInt < dist2(_startV, _endV)) {
            const newC1 = new THREE.Vector3((_startV.x+_c1.x)*0.5, 0, (_startV.z+_c1.z)*0.5);
            const newC2 = new THREE.Vector3((_c1.x+_endV.x)*0.5, 0, (_c1.z+_endV.z)*0.5);
            divPathQ(_startV, midV, newC1, _segmentsRaw, _verticesRaw, _path, _pathVertices, _originV, _type);
            if (typeForStroke(getStroke($(_path))) == "mountain" || typeForStroke(getStroke($(_path))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            if (_path.targetAngle && _segmentsRaw.length>0) _segmentsRaw[_segmentsRaw.length-1].push(_path.targetAngle);
            let vertex;
            if (_type === "q") {
                vertex = new THREE.Vector3(_originV.x+midV.x, 0, _originV.z+midV.z);
            } else {
                vertex = new THREE.Vector3(midV.x, 0, midV.z);
            }
            _verticesRaw.push(vertex);
            _pathVertices.push(vertex);
            divPathQ(midV, _endV, newC2, _segmentsRaw, _verticesRaw, _path, _pathVertices, _originV, _type);
        }
    }

    function calcMidVQ(_startV, _endV, _c1, _t) {
        const u = 1-_t;
        return new THREE.Vector3(u*u*_startV.x + 2*_t*u*_c1.x + _t*_t*_endV.x, 0, u*u*_startV.z + 2*_t*u*_c1.z + _t*_t*_endV.z);
    }

    function parseLine(_verticesRaw, _segmentsRaw, $elements){
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];
            if (typeForStroke(getStroke($(element))) == "border") {
                const vert1 = new THREE.Vector3(element.x1.baseVal.value, 0, element.y1.baseVal.value);
                const vert2 = new THREE.Vector3(element.x2.baseVal.value, 0, element.y2.baseVal.value);

                _verticesRaw.push(vert1);
                let startVertex = _verticesRaw.length-1;
                let distance = Math.sqrt(Math.pow(vert2.x - vert1.x, 2) + Math.pow(vert2.z - vert1.z, 2));
                let n = Math.ceil(distance / globals.vertInt);
                if (n > 1) {
                    for (let i = n - 1; i >= 0; i--) {
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        const vertex = new THREE.Vector3((i*vert1.x+(n-i)*vert2.x)/n, 0, (i*vert1.z+(n-i)*vert2.z)/n);
                        _verticesRaw.push(vertex);
                    }
                } else {
                    _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                    _verticesRaw.push(vert2);
                }

                for (let j=1;j<=_verticesRaw.length-1-startVertex;j++){
                    if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-j].push(element.targetAngle);
                    applyTransformation(_verticesRaw[_verticesRaw.length-j], element);
                }
            } else {
                _verticesRaw.push(new THREE.Vector3(element.x1.baseVal.value, 0, element.y1.baseVal.value));
                _verticesRaw.push(new THREE.Vector3(element.x2.baseVal.value, 0, element.y2.baseVal.value));
                _segmentsRaw.push([_verticesRaw.length-2, _verticesRaw.length-1]);
                if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-1].push(element.targetAngle);
                applyTransformation(_verticesRaw[_verticesRaw.length-2], element);
                applyTransformation(_verticesRaw[_verticesRaw.length-1], element);
            }
        }
    }

    function parseRect(_verticesRaw, _segmentsRaw, $elements){
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];
            var x = element.x.baseVal.value;
            var y = element.y.baseVal.value;
            var width = element.width.baseVal.value;
            var height = element.height.baseVal.value;
            if (typeForStroke(getStroke($(element))) == "border") {
                const vert1 = new THREE.Vector3(x, 0, y);
                const vert2 = new THREE.Vector3(x+width, 0, y);
                const vert3 = new THREE.Vector3(x+width, 0, y+height);
                const vert4 = new THREE.Vector3(x, 0, y+height);

                _verticesRaw.push(vert1);
                let startVertex = _verticesRaw.length-1;
                let distance = Math.sqrt(Math.pow(vert2.x - vert1.x, 2) + Math.pow(vert2.z - vert1.z, 2));
                let n = Math.ceil(distance / globals.vertInt);
                if (n > 1) {
                    for (let i = n - 1; i >= 0; i--) {
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        const vertex = new THREE.Vector3((i*vert1.x+(n-i)*vert2.x)/n, 0, (i*vert1.z+(n-i)*vert2.z)/n);
                        _verticesRaw.push(vertex);
                    }
                } else {
                    _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                    _verticesRaw.push(vert2);
                }

                distance = Math.sqrt(Math.pow(vert3.x - vert2.x, 2) + Math.pow(vert3.z - vert2.z, 2));
                n = Math.ceil(distance / globals.vertInt);
                if (n > 1) {
                    for (let i = n - 1; i >= 0; i--) {
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        const vertex = new THREE.Vector3((i*vert2.x+(n-i)*vert3.x)/n, 0, (i*vert2.z+(n-i)*vert3.z)/n);
                        _verticesRaw.push(vertex);
                    }
                } else {
                    _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                    _verticesRaw.push(vert3);
                }

                distance = Math.sqrt(Math.pow(vert4.x - vert3.x, 2) + Math.pow(vert4.z - vert3.z, 2));
                n = Math.ceil(distance / globals.vertInt);
                if (n > 1) {
                    for (let i = n - 1; i >= 0; i--) {
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        const vertex = new THREE.Vector3((i*vert3.x+(n-i)*vert4.x)/n, 0, (i*vert3.z+(n-i)*vert4.z)/n);
                        _verticesRaw.push(vertex);
                    }
                } else {
                    _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                    _verticesRaw.push(vert4);
                }

                distance = Math.sqrt(Math.pow(vert1.x - vert4.x, 2) + Math.pow(vert1.z - vert4.z, 2));
                n = Math.ceil(distance / globals.vertInt);
                if (n > 1) {
                    for (let i = n - 1; i >= 1; i--) {
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        const vertex = new THREE.Vector3((i*vert4.x+(n-i)*vert1.x)/n, 0, (i*vert4.z+(n-i)*vert1.z)/n);
                        _verticesRaw.push(vertex);
                    }
                    _segmentsRaw.push([_verticesRaw.length-1, startVertex]);
                } else {
                    _segmentsRaw.push([_verticesRaw.length-1, startVertex]);
                }

                for (let j=1;j<=_verticesRaw.length-startVertex;j++){
                    if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-j].push(element.targetAngle);
                    applyTransformation(_verticesRaw[_verticesRaw.length-j], element);
                }
            } else {
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
                    applyTransformation(_verticesRaw[_verticesRaw.length-j], element);
                }
            }
        }
    }

    function parsePolygon(_verticesRaw, _segmentsRaw, $elements){
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];
            if (typeForStroke(getStroke($(element))) == "border") {
                const vert = new THREE.Vector3(element.points[0].x, 0, element.points[0].y);
                _verticesRaw.push(vert);
                let startVertex = _verticesRaw.length-1;
                for (let j=0;j<element.points.length-1;j++){
                    const vert1 = new THREE.Vector3(element.points[j].x, 0, element.points[j].y);
                    const vert2 = new THREE.Vector3(element.points[j+1].x, 0, element.points[j+1].y)

                    let distance = Math.sqrt(Math.pow(vert2.x - vert1.x, 2) + Math.pow(vert2.z - vert1.z, 2));
                    let n = Math.ceil(distance / globals.vertInt);
                    if (n > 1) {
                        for (let k = n - 1; k >= 0; k--) {
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            const vertex = new THREE.Vector3((k*vert1.x+(n-k)*vert2.x)/n, 0, (k*vert1.z+(n-k)*vert2.z)/n);
                            _verticesRaw.push(vertex);
                        }
                    } else {
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        _verticesRaw.push(vert2);
                    }
                }

                const vert1 = new THREE.Vector3(element.points[element.points.length-1].x, 0, element.points[element.points.length-1].y);
                const vert2 = vert.clone();

                let distance = Math.sqrt(Math.pow(vert2.x - vert1.x, 2) + Math.pow(vert2.z - vert1.z, 2));
                let n = Math.ceil(distance / globals.vertInt);
                if (n > 1) {
                    for (let j = n - 1; j >= 1; j--) {
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        const vertex = new THREE.Vector3((j*vert1.x+(n-j)*vert2.x)/n, 0, (j*vert1.z+(n-j)*vert2.z)/n);
                        _verticesRaw.push(vertex);
                    }
                    _segmentsRaw.push([_verticesRaw.length-1, startVertex]);
                } else {
                    _segmentsRaw.push([_verticesRaw.length-1, startVertex]);
                }

                for (let j=1;j<=_verticesRaw.length-startVertex;j++){
                    if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-j].push(element.targetAngle);
                    applyTransformation(_verticesRaw[_verticesRaw.length-j], element);
                }
            } else {
                for (let j=0;j<element.points.length-1;j++){
                    _verticesRaw.push(new THREE.Vector3(element.points[j].x, 0, element.points[j].y));
                    applyTransformation(_verticesRaw[_verticesRaw.length-1], element);

                    if (j<element.points.length-1) _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                    else _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length-element.points.length]);

                    if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-1].push(element.targetAngle);
                }
            }
        }
    }

    function parsePolyline(_verticesRaw, _segmentsRaw, $elements){
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];
            if (typeForStroke(getStroke($(element))) == "border") {
                const vert = new THREE.Vector3(element.points[0].x, 0, element.points[0].y);
                _verticesRaw.push(vert);
                let startVertex = _verticesRaw.length-1;
                for (let j=0;j<element.points.length-1;j++){
                    const vert1 = new THREE.Vector3(element.points[j].x, 0, element.points[j].y);
                    const vert2 = new THREE.Vector3(element.points[j+1].x, 0, element.points[j+1].y)

                    let distance = Math.sqrt(Math.pow(vert2.x - vert1.x, 2) + Math.pow(vert2.z - vert1.z, 2));
                    let n = Math.ceil(distance / globals.vertInt);
                    if (n > 1) {
                        for (let k = n - 1; k >= 0; k--) {
                            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                            const vertex = new THREE.Vector3((k*vert1.x+(n-k)*vert2.x)/n, 0, (k*vert1.z+(n-k)*vert2.z)/n);
                            _verticesRaw.push(vertex);
                        }
                    } else {
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
                        _verticesRaw.push(vert2);
                    }
                }
                for (let j=1;j<=_verticesRaw.length-startVertex;j++){
                    if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-j].push(element.targetAngle);
                    applyTransformation(_verticesRaw[_verticesRaw.length-j], element);
                }
            } else {
                for (var j=0;j<element.points.length;j++){
                    _verticesRaw.push(new THREE.Vector3(element.points[j].x, 0, element.points[j].y));
                    applyTransformation(_verticesRaw[_verticesRaw.length-1], element);
                    if (j>0) {
                        _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length-2]);
                        if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-1].push(element.targetAngle);
                    }
                }
            }
        }
    }

    function parseEllipse(_verticesRaw, _segmentsRaw, $elements) {
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];

            const cx = element.cx.baseVal.value;
            const cy = element.cy.baseVal.value;
            const rx = element.rx.baseVal.value;
            const ry = element.ry.baseVal.value;

            const vert1 = new THREE.Vector3(cx+rx, 0, cy+0);
            const vert2 = new THREE.Vector3(cx+0, 0, cy+ry);
            const vert3 = new THREE.Vector3(cx-rx, 0, cy+0);
            const vert4 = new THREE.Vector3(cx+0, 0, cy-ry);

            const m = (4*(Math.sqrt(2)-1)*ry)/3;
            const n = (4*(Math.sqrt(2)-1)*rx)/3;

            const c1 = new THREE.Vector3(cx+rx, 0, cy+n);
            const c2 = new THREE.Vector3(cx+m, 0, cy+ry);
            const c3 = new THREE.Vector3(cx-m, 0, cy+ry);
            const c4 = new THREE.Vector3(cx-rx, 0, cy+n);
            const c5 = new THREE.Vector3(cx-rx, 0, cy-n);
            const c6 = new THREE.Vector3(cx-m, 0, cy-ry);
            const c7 = new THREE.Vector3(cx+m, 0, cy-ry);
            const c8 = new THREE.Vector3(cx+rx, 0, cy-n);

            _verticesRaw.push(vert1);
            const startVertLength = _verticesRaw.length-1;
            divEllipse(vert1, vert2, c1, c2, _segmentsRaw, _verticesRaw, element);
            if (typeForStroke(getStroke($(element))) == "mountain" || typeForStroke(getStroke($(element))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            _verticesRaw.push(vert2);
            divEllipse(vert2, vert3, c3, c4, _segmentsRaw, _verticesRaw, element);
            if (typeForStroke(getStroke($(element))) == "mountain" || typeForStroke(getStroke($(element))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            _verticesRaw.push(vert3);
            divEllipse(vert3, vert4, c5, c6, _segmentsRaw, _verticesRaw, element);
            if (typeForStroke(getStroke($(element))) == "mountain" || typeForStroke(getStroke($(element))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            _verticesRaw.push(vert4);
            divEllipse(vert4, vert1, c7, c8, _segmentsRaw, _verticesRaw, element);
            if (typeForStroke(getStroke($(element))) == "mountain" || typeForStroke(getStroke($(element))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, startVertLength]);

            for (let j=1;j<=_verticesRaw.length-startVertLength;j++){
                if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-j].push(element.targetAngle);
                applyTransformation(_verticesRaw[_verticesRaw.length-j], element);
            }
        }
    }

    function parseCircle(_verticesRaw, _segmentsRaw, $elements) {
        for (var i=0;i<$elements.length;i++){
            var element = $elements[i];

            const cx = element.cx.baseVal.value;
            const cy = element.cy.baseVal.value;
            const r = element.r.baseVal.value;

            const vert1 = new THREE.Vector3(cx+r, 0, cy+0);
            const vert2 = new THREE.Vector3(cx+0, 0, cy+r);
            const vert3 = new THREE.Vector3(cx-r, 0, cy+0);
            const vert4 = new THREE.Vector3(cx+0, 0, cy-r);

            const m = (4*(Math.sqrt(2)-1)*r)/3;
            const n = (4*(Math.sqrt(2)-1)*r)/3;

            const c1 = new THREE.Vector3(cx+r, 0, cy+n);
            const c2 = new THREE.Vector3(cx+m, 0, cy+r);
            const c3 = new THREE.Vector3(cx-m, 0, cy+r);
            const c4 = new THREE.Vector3(cx-r, 0, cy+n);
            const c5 = new THREE.Vector3(cx-r, 0, cy-n);
            const c6 = new THREE.Vector3(cx-m, 0, cy-r);
            const c7 = new THREE.Vector3(cx+m, 0, cy-r);
            const c8 = new THREE.Vector3(cx+r, 0, cy-n);

            _verticesRaw.push(vert1);
            const startVertLength = _verticesRaw.length-1;
            divEllipse(vert1, vert2, c1, c2, _segmentsRaw, _verticesRaw, element);
            if (typeForStroke(getStroke($(element))) == "mountain" || typeForStroke(getStroke($(element))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            _verticesRaw.push(vert2);
            divEllipse(vert2, vert3, c3, c4, _segmentsRaw, _verticesRaw, element);
            if (typeForStroke(getStroke($(element))) == "mountain" || typeForStroke(getStroke($(element))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            _verticesRaw.push(vert3);
            divEllipse(vert3, vert4, c5, c6, _segmentsRaw, _verticesRaw, element);
            if (typeForStroke(getStroke($(element))) == "mountain" || typeForStroke(getStroke($(element))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            _verticesRaw.push(vert4);
            divEllipse(vert4, vert1, c7, c8, _segmentsRaw, _verticesRaw, element);
            if (typeForStroke(getStroke($(element))) == "mountain" || typeForStroke(getStroke($(element))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, startVertLength]);

            for (let j=1;j<=_verticesRaw.length-startVertLength;j++){
                if (element.targetAngle) _segmentsRaw[_segmentsRaw.length-j].push(element.targetAngle);
                applyTransformation(_verticesRaw[_verticesRaw.length-j], element);
            }
        }
    }

    function divEllipse(_startV, _endV, _c1, _c2, _segmentsRaw, _verticesRaw, _element) {
        let a, b, midV, d;
        if (_endV.x - _startV.x == 0) {
            midV = calcMidVC(_startV, _endV, _c1, _c2, 0.5);
            d = Math.abs(midV.x - _endV.x);
        } else {
            a = (_endV.z - _startV.z)/(_endV.x - _startV.x);
            b = _endV.z - a*_endV.x;
            midV = calcMidVC(_startV, _endV, _c1, _c2, 0.5);
            d = Math.abs(a*midV.x + (-1)*midV.z + b)/Math.sqrt(a*a+1);
        }
        if (globals.apprCurve < d || globals.vertInt * globals.vertInt < dist2(_startV, _endV)) {
            const newC1 = new THREE.Vector3((_startV.x+_c1.x)*0.5, 0, (_startV.z+_c1.z)*0.5);
            const newC2 = new THREE.Vector3((_c1.x+_c2.x)*0.5, 0, (_c1.z+_c2.z)*0.5);
            const newC3 = new THREE.Vector3((_c2.x+_endV.x)*0.5, 0, (_c2.z+_endV.z)*0.5);
            const newC4 = new THREE.Vector3((newC1.x+newC2.x)*0.5, 0, (newC1.z+newC2.z)*0.5);
            const newC5 = new THREE.Vector3((newC2.x+newC3.x)*0.5, 0, (newC2.z+newC3.z)*0.5);
            divEllipse(_startV, midV, newC1, newC4, _segmentsRaw, _verticesRaw, _element);
            if (typeForStroke(getStroke($(_element))) == "mountain" || typeForStroke(getStroke($(_element))) == "valley") {
                _segmentsRaw.push(["C"]);
            }
            _segmentsRaw.push([_verticesRaw.length-1, _verticesRaw.length]);
            let vertex = new THREE.Vector3(midV.x, 0, midV.z);
            _verticesRaw.push(vertex);
            divEllipse(midV, _endV, newC5, newC3, _segmentsRaw, _verticesRaw, _element);
        }
    }

    function loadSVG(url, isDemo){
        if (isDemo) {
            gtag('event', 'demoFile', { 'CC': true });
        } else {
            gtag('event', 'uploadCP', { 'CC': true });
        }

        // Some SVG files start with UTF-8 byte order mark (BOM) EF BB BF,
        // which encodes in Base64 to 77u/ -- remove this, as it breaks the
        // XML/SVG parser.
        url = url.replace(/^(data:image\/svg\+xml;base64,)77u\//, '$1');

        SVGloader.load(url, function(svg){

            var _$svg = $(svg);
            if (_$svg.find('parsererror').length) {
                globals.warn("Error parsing SVG: " + svg.innerText);
                return console.warn(_$svg.find('parsererror')[0]);
            }

            // Add SVG to page dom to reveal rendered styles (including CSS).
            $(svg).appendTo('body');

            clearAll();

            //warn of groups
            // var $groups = _$svg.children("g");
            // if ($groups.length>0){
            //     globals.warn("Grouped elements found in SVG, these are currently ignored by the app.  " +
            //         "Please ungroup all elements before importing.");
            // }

            //format all appropriate svg elements
            _$svg.find("symbol").remove();
            _$svg.find("defs > :not(style)").remove();
            var $paths = _$svg.find("path");
            var $lines = _$svg.find("line");
            var $rects = _$svg.find("rect");
            var $polygons = _$svg.find("polygon");
            var $polylines = _$svg.find("polyline");
            var $ellipses = _$svg.find("ellipse");
            var $circles = _$svg.find("circle");
            $paths.css({fill:"none", 'stroke-dasharray':"none"});
            $lines.css({fill:"none", 'stroke-dasharray':"none"});
            $rects.css({fill:"none", 'stroke-dasharray':"none"});
            $polygons.css({fill:"none", 'stroke-dasharray':"none"});
            $polylines.css({fill:"none", 'stroke-dasharray':"none"});
            $ellipses.css({fill:"none", 'stroke-dasharray':"none"});
            $circles.css({fill:"none", 'stroke-dasharray':"none"});

            findType(verticesRaw, bordersRaw, borderFilter, $paths, $lines, $rects, $polygons, $polylines, $ellipses, $circles);
            findType(verticesRaw, mountainsRaw, mountainFilter, $paths, $lines, $rects, $polygons, $polylines, $ellipses, $circles);
            findType(verticesRaw, valleysRaw, valleyFilter, $paths, $lines, $rects, $polygons, $polylines, $ellipses, $circles);
            findType(verticesRaw, cutsRaw, cutFilter, $paths, $lines, $rects, $polygons, $polylines, $ellipses, $circles);
            findType(verticesRaw, triangulationsRaw, triangulationFilter, $paths, $lines, $rects, $polygons, $polylines, $ellipses, $circles);
            findType(verticesRaw, hingesRaw, hingeFilter, $paths, $lines, $rects, $polygons, $polylines, $ellipses, $circles);

            if (badColors.length>0){
                badColors = _.uniq(badColors);
                var string = "Some objects found with the following stroke colors:<br/><br/>";
                _.each(badColors, function(color){
                    string += "<span style='background:" + color + "' class='colorSwatch'></span>" + color + "<br/>";
                });
                string +=  "<br/>These objects were ignored.<br/>  Please check that your file is set up correctly, <br/>" +
                    "see <b>File > Design Tips</b> for more information.";
                globals.warn(string);
            }

            // Now that loading is done, remove SVG from page DOM.
            _$svg.remove();

            //todo revert back to old pattern if bad import
            var success = parseSVG(verticesRaw, bordersRaw, mountainsRaw, valleysRaw, cutsRaw, triangulationsRaw, hingesRaw);
            if (!success) return;

            //find max and min vertices
            var max = new THREE.Vector3(-Infinity,-Infinity,-Infinity);
            var min = new THREE.Vector3(Infinity,Infinity,Infinity);
            for (var i=0;i<rawFold.vertices_coords.length;i++){
                var vertex = new THREE.Vector3(rawFold.vertices_coords[i][0], rawFold.vertices_coords[i][1], rawFold.vertices_coords[i][2]);
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
            if (scale == 0) return;

            var strokeWidth = scale/300;
            border.multiplyScalar(scale);
            min.sub(border);
            max.add(border.multiplyScalar(2));
            var viewBoxTxt = min.x + " " + min.z + " " + max.x + " " + max.z;

            var ns = 'http://www.w3.org/2000/svg';
            var svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', viewBoxTxt);
            for (var i=0;i<rawFold.edges_vertices.length;i++){
                var line = document.createElementNS(ns, 'line');
                var edge = rawFold.edges_vertices[i];
                var vertex = rawFold.vertices_coords[edge[0]];
                line.setAttribute('stroke', colorForAssignment(rawFold.edges_assignment[i]));
                line.setAttribute('opacity', opacityForAngle(rawFold.edges_foldAngle[i], rawFold.edges_assignment[i]));
                line.setAttribute('x1', vertex[0]);
                line.setAttribute('y1', vertex[2]);
                vertex = rawFold.vertices_coords[edge[1]];
                line.setAttribute('x2', vertex[0]);
                line.setAttribute('y2', vertex[2]);
                line.setAttribute('stroke-width', strokeWidth);
                svg.appendChild(line);
            }
            $("#svgViewer").html(svg);

            },
            function(){},
            function(error){
                globals.warn("Error loading SVG " + url + " : " + error);
                console.warn(error);
        });
    }

    function parseSVG(_verticesRaw, _bordersRaw, _mountainsRaw, _valleysRaw, _cutsRaw, _triangulationsRaw, _hingesRaw){

        _.each(_verticesRaw, function(vertex){
            foldData.vertices_coords.push([vertex.x, vertex.z]);
        });
        _.each(_bordersRaw, function(edge){
            foldData.edges_vertices.push([edge[0], edge[1]]);
            foldData.edges_assignment.push("B");
            foldData.edges_foldAngle.push(null);
        });
        for (let index = 0; index < _mountainsRaw.length; index++) {
            const edge = _mountainsRaw[index];
            if (edge[0] == "C") {
                const curvedEdge = _mountainsRaw[index+1];
                foldData.edges_vertices.push([curvedEdge[0], curvedEdge[1]]);
                foldData.edges_assignment.push("CM");
                foldData.edges_foldAngle.push(curvedEdge[2]);
                _mountainsRaw.splice(index, 1);
            } else {
                foldData.edges_vertices.push([edge[0], edge[1]]);
                foldData.edges_assignment.push("M");
                foldData.edges_foldAngle.push(edge[2]);
            }
        }
        for (let index = 0; index < _valleysRaw.length; index++) {
            const edge = _valleysRaw[index];
            if (edge[0] == "C") {
                const curvedEdge = _valleysRaw[index+1];
                foldData.edges_vertices.push([curvedEdge[0], curvedEdge[1]]);
                foldData.edges_assignment.push("CV");
                foldData.edges_foldAngle.push(curvedEdge[2]);
                _valleysRaw.splice(index, 1);
            } else {
                foldData.edges_vertices.push([edge[0], edge[1]]);
                foldData.edges_assignment.push("V");
                foldData.edges_foldAngle.push(edge[2]);
            }
        }
        _.each(_triangulationsRaw, function(edge){
            foldData.edges_vertices.push([edge[0], edge[1]]);
            foldData.edges_assignment.push("F");
            foldData.edges_foldAngle.push(0);
        });
        _.each(_hingesRaw, function(edge){
            foldData.edges_vertices.push([edge[0], edge[1]]);
            foldData.edges_assignment.push("U");
            foldData.edges_foldAngle.push(null);
        });
        _.each(_cutsRaw, function(edge){
            foldData.edges_vertices.push([edge[0], edge[1]]);
            foldData.edges_assignment.push("C");
            foldData.edges_foldAngle.push(null);
        });

        if (foldData.vertices_coords.length == 0 || foldData.edges_vertices.length == 0){
            globals.warn("No valid geometry found in SVG, be sure to ungroup all and remove all clipping masks.");
            return false;
        }

        // FOLD.filter.collapseNearbyVertices
        // FOLD.filter.removeLoopEdges
        // FOLD.filter.removeDuplicateEdges_vertices
        // findIntersections
        // FOLD.convert.edges_vertices_to_vertices_vertices_unsorted
        // removeStrayVertices
        // FOLD.convert.sort_vertices_vertices
        // FOLD.convert.vertices_vertices_to_faces_vertices
        // edgesVerticesToVerticesEdges
        // removeBorderFaces

        foldData = FOLD.filter.collapseNearbyVertices(foldData, globals.vertTol);
        foldData = FOLD.filter.removeLoopEdges(foldData);//remove edges that points to same vertex
        foldData = FOLD.filter.removeDuplicateEdges_vertices(foldData);//remove duplicate edges
        // foldData = FOLD.filter.subdivideCrossingEdges_vertices(foldData, globals.vertTol);//find intersections and add vertices/edges

        foldData = findIntersections(foldData, globals.vertTol);
        //cleanup after intersection operation
        foldData = FOLD.filter.collapseNearbyVertices(foldData, globals.vertTol);
        foldData = FOLD.filter.removeLoopEdges(foldData);//remove edges that points to same vertex
        foldData = FOLD.filter.removeDuplicateEdges_vertices(foldData);//remove duplicate edges

        foldData = FOLD.convert.edges_vertices_to_vertices_vertices_unsorted(foldData);
        foldData = removeStrayVertices(foldData);//delete stray anchors
        // foldData = removeRedundantVertices(foldData, 0.01);//remove vertices that split edge

        foldData.vertices_vertices = FOLD.convert.sort_vertices_vertices(foldData);
        foldData = FOLD.convert.vertices_vertices_to_faces_vertices(foldData);

        foldData = edgesVerticesToVerticesEdges(foldData);
        foldData = removeBorderFaces(foldData);//expose holes surrounded by all border edges

        foldData = reverseFaceOrder(foldData);//set faces to counter clockwise

        return processFold(foldData);
    }

    function processFold(fold, returnCreaseParams){

        //add missing coordinates to make 3d, mapping (x,y) -> (x,0,z)
        //This is against the FOLD spec which says that, beyond two dimensions,
        //"all unspecified coordinates are implicitly zero"...
        var is2d = true;
        for (var i=0;i<fold.vertices_coords.length;i++){
            var vertex = fold.vertices_coords[i];
            if (vertex.length === 2) {
                fold.vertices_coords[i] = [vertex[0], 0, vertex[1]];
            } else {
                is2d = false;
            }
        }

        //save pre-triangulated faces for later saveFOLD()
        rawFold = JSON.parse(JSON.stringify(fold));

        var cuts = FOLD.filter.cutEdges(fold);
        if (cuts.length>0) {
            fold = splitCuts(fold);
            fold = FOLD.convert.edges_vertices_to_vertices_vertices_unsorted(fold);
            fold = removeRedundantVertices(fold, 0.01);//remove vertices that split edge
        }
        delete fold.vertices_vertices;
        delete fold.vertices_edges;

        foldData = triangulatePolys(fold);
        
        for (let index = 0; index < foldData.edges_assignment.length; index++) {
            if (foldData.edges_assignment[index] == "CM") {
                foldData.edges_assignment[index] = "M";
            } else if (foldData.edges_assignment[index] == "CV") {
                foldData.edges_assignment[index] = "V";
            }
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
        if (returnCreaseParams) return allCreaseParams;

        globals.model.buildModel(foldData, allCreaseParams);
        return foldData;
    }

    function reverseFaceOrder(fold){
        for (var i=0;i<fold.faces_vertices.length;i++){
            fold.faces_vertices[i].reverse();
        }
        return fold;
    }

    function edgesVerticesToVerticesEdges(fold){
        var verticesEdges = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            verticesEdges.push([]);
        }
        for (var i=0;i<fold.edges_vertices.length;i++){
            var edge = fold.edges_vertices[i];
            verticesEdges[edge[0]].push(i);
            verticesEdges[edge[1]].push(i);
        }
        fold.vertices_edges = verticesEdges;
        return fold;
    }

    function facesVerticesToVerticesFaces(fold){
        var verticesFaces = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            verticesFaces.push([]);
        }
        for (var i=0;i<fold.faces_vertices.length;i++){
            var face = fold.faces_vertices[i];
            for (var j=0;j<face.length;j++){
                verticesFaces[face[j]].push(i);
            }
        }
        fold.vertices_faces = verticesFaces;
        return fold;
    }

    function sortVerticesEdges(fold){
        for (var i=0;i<fold.vertices_vertices.length;i++){
            var verticesVertices = fold.vertices_vertices[i];
            var verticesEdges = fold.vertices_edges[i];
            var sortedVerticesEdges = [];
            for (var j=0;j<verticesVertices.length;j++){
                var index = -1;
                for (var k=0;k<verticesEdges.length;k++){
                    var edgeIndex = verticesEdges[k];
                    var edge = fold.edges_vertices[edgeIndex];
                    if (edge.indexOf(verticesVertices[j])>=0){
                        index = edgeIndex;
                        break;
                    }
                }
                if (index<0) console.warn("no matching edge found, fix this");
                sortedVerticesEdges.push(index);
            }
            fold.vertices_edges[i] = sortedVerticesEdges;
        }
        return fold;
    }

    function splitCuts(fold){
        fold = sortVerticesEdges(fold);
        fold = facesVerticesToVerticesFaces(fold);
        //go around each vertex and split cut in clockwise order
        for (var i=0;i<fold.vertices_edges.length;i++){
            var groups = [[]];
            var groupIndex = 0;
            var verticesEdges = fold.vertices_edges[i];
            var verticesFaces = fold.vertices_faces[i];
            for (var j=0;j<verticesEdges.length;j++){
                var edgeIndex = verticesEdges[j];
                var assignment = fold.edges_assignment[edgeIndex];
                groups[groupIndex].push(edgeIndex);
                if (assignment == "C"){
                    //split cut edge into two boundary edges
                    groups.push([fold.edges_vertices.length]);
                    groupIndex++;
                    var newEdgeIndex = fold.edges_vertices.length;
                    var edge = fold.edges_vertices[edgeIndex];
                    fold.edges_vertices.push([edge[0], edge[1]]);
                    fold.edges_assignment[edgeIndex] = "B";
                    fold.edges_foldAngle.push(null);
                    fold.edges_assignment.push("B");
                    //add new boundary edge to other vertex
                    var otherVertex = edge[0];
                    if (otherVertex == i) otherVertex = edge[1];
                    var otherVertexEdges = fold.vertices_edges[otherVertex];
                    var otherVertexEdgeIndex = otherVertexEdges.indexOf(edgeIndex);
                    otherVertexEdges.splice(otherVertexEdgeIndex, 0, newEdgeIndex);
                } else if (assignment == "B"){
                    if (j==0 && verticesEdges.length>1){
                        //check if next edge is also boundary
                        var nextEdgeIndex = verticesEdges[1];
                        if (fold.edges_assignment[nextEdgeIndex] == "B"){
                            //check if this edge shares a face with the next
                            var edge = fold.edges_vertices[edgeIndex];
                            var otherVertex = edge[0];
                            if (otherVertex == i) otherVertex = edge[1];
                            var nextEdge = fold.edges_vertices[nextEdgeIndex];
                            var nextVertex  = nextEdge[0];
                            if (nextVertex == i) nextVertex = nextEdge[1];
                            if (connectedByFace(fold, fold.vertices_faces[i], otherVertex, nextVertex)){
                            } else {
                                groups.push([]);
                                groupIndex++;
                            }
                        }
                    } else if (groups[groupIndex].length>1) {
                        groups.push([]);
                        groupIndex++;
                    }
                }
            }
            if (groups.length <= 1) continue;
            for (var k=groups[groupIndex].length-1;k>=0;k--){//put remainder of last group in first group
                groups[0].unshift(groups[groupIndex][k]);
            }
            groups.pop();
            for (var j=1;j<groups.length;j++){//for each extra group, assign new vertex
                var currentVertex = fold.vertices_coords[i];
                var vertIndex = fold.vertices_coords.length;
                fold.vertices_coords.push(currentVertex.slice());//make a copy
                var connectingIndices = [];
                for (var k=0;k<groups[j].length;k++){//update edges_vertices
                    var edgeIndex = groups[j][k];
                    var edge = fold.edges_vertices[edgeIndex];
                    var otherIndex = edge[0];
                    if (edge[0] == i) {
                        edge[0] = vertIndex;
                        otherIndex = edge[1];
                    } else edge[1] = vertIndex;
                    connectingIndices.push(otherIndex);
                }
                if (connectingIndices.length<2) {
                    console.warn("problem here");
                } else {
                    for (var k=1;k<connectingIndices.length;k++){//update faces_vertices
                        //i, k-1, k
                        var thisConnectingVertIndex = connectingIndices[k];
                        var previousConnectingVertIndex = connectingIndices[k-1];
                        var found = false;
                        for (var a=0;a<verticesFaces.length;a++){
                            var face = fold.faces_vertices[verticesFaces[a]];
                            var index1 = face.indexOf(thisConnectingVertIndex);
                            var index2 = face.indexOf(previousConnectingVertIndex);
                            var index3 = face.indexOf(i);
                            if (index1 >= 0 && index2 >= 0 && index3>=0 &&
                                (Math.abs(index1-index3) === 1 || Math.abs(index1-index3) === face.length-1) &&
                                (Math.abs(index2-index3) === 1 || Math.abs(index2-index3) === face.length-1)){
                                found = true;
                                face[index3] = vertIndex;
                                break;
                            }
                        }
                        if (!found) console.warn("problem here");
                    }
                }
            }
        }
        //these are all incorrect now
        delete fold.vertices_faces;
        delete fold.vertices_edges;
        delete fold.vertices_vertices;
        return fold;
    }

    function connectedByFace(fold, verticesFaces, vert1, vert2){
        if (vert1 == vert2) return false;
        for (var a=0;a<verticesFaces.length;a++){
            var face = fold.faces_vertices[verticesFaces[a]];
            if (face.indexOf(vert1) >= 0 && face.indexOf(vert2) >= 0){
                return true;
            }
        }
        return false;
    }

    function removeBorderFaces(fold){
        for (var i=fold.faces_vertices.length-1;i>=0;i--){
            var face = fold.faces_vertices[i];
            var allBorder = true;

            for (var j=0;j<face.length;j++){
                var vertexIndex = face[j];
                var nextIndex = j+1;
                if (nextIndex >= face.length) nextIndex = 0;
                var nextVertexIndex = face[nextIndex];
                var connectingEdgeFound = false;
                for (var k=0;k<fold.vertices_edges[vertexIndex].length;k++){
                    var edgeIndex = fold.vertices_edges[vertexIndex][k];
                    var edge = fold.edges_vertices[edgeIndex];
                    if ((edge[0] == vertexIndex && edge[1] == nextVertexIndex) ||
                        (edge[1] == vertexIndex && edge[0] == nextVertexIndex)){
                        connectingEdgeFound = true;
                        var assignment = fold.edges_assignment[edgeIndex];
                        if (assignment != "B"){
                            allBorder = false;
                            break;
                        }
                    }
                }
                if (!connectingEdgeFound) console.warn("no connecting edge found on face");
                if (!allBorder) break;
            }
            if (allBorder) fold.faces_vertices.splice(i,1);
        }
        return fold;
    }

    function getFacesAndVerticesForEdges(fold){
        var allCreaseParams = [];//face1Ind, vertInd, face2Ind, ver2Ind, edgeInd, angle
        var faces = fold.faces_vertices;
        for (var i=0;i<fold.edges_vertices.length;i++){
            var assignment = fold.edges_assignment[i];
            if (assignment !== "M" && assignment !== "V" && assignment !== "F") continue;
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
                            var angle = fold.edges_foldAngle[i];
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
            var dot = vec0[0]*vec1[0]+vec0[1]*vec1[1];
            if (threeD){
                vec0.push(neighbor0[2]-vertex_coord[2]);
                vec1.push(neighbor1[2]-vertex_coord[2]);
                magSqVec0 += vec0[2]*vec0[2];
                magSqVec1 += vec1[2]*vec1[2];
                dot += vec0[2]*vec1[2];
            }
            dot /= Math.sqrt(magSqVec0*magSqVec1);
            if (Math.abs(dot + 1.0)<epsilon){
                var merged = mergeEdge(fold, vertex_vertices[0], i, vertex_vertices[1]);
                if (merged){
                    numRedundant++;
                    old2new.push(null);
                } else {
                    old2new.push(newIndex++);
                    continue;
                }
            } else old2new.push(newIndex++);
        }
        if (numRedundant == 0) return fold;
        console.warn(numRedundant + " redundant vertices found");
        fold = FOLD.filter.remapField(fold, 'vertices', old2new);
        if (fold.faces_vertices){
            for (var i=0;i<fold.faces_vertices.length;i++){
                var face = fold.faces_vertices[i];
                for (var j=face.length-1;j>=0;j--){
                    if (face[j] === null) face.splice(j, 1);
                }
            }
        }
        return fold;
    }

    function mergeEdge(fold, v1, v2, v3){//v2 is center vertex
        var angleAvg = 0;
        var avgSum = 0;
        var angles = [];
        var edgeAssignment = null;
        var edgeIndices = [];
        for (var i=fold.edges_vertices.length-1;i>=0;i--){
            var edge = fold.edges_vertices[i];
            if (edge.indexOf(v2)>=0 && (edge.indexOf(v1) >= 0 || edge.indexOf(v3) >= 0)){
                if (edgeAssignment === null) edgeAssignment = fold.edges_assignment[i];
                else if (edgeAssignment != fold.edges_assignment[i]) {
                    console.log(edgeAssignment, fold.edges_assignment[i]);
                    console.warn("different edge assignments");
                    return false;
                }
                var angle = fold.edges_foldAngle[i];
                if (isNaN(angle)) console.log(i);
                angles.push(angle);
                if (angle) {
                    angleAvg += angle;
                    avgSum++;
                }
                edgeIndices.push(i);//larger index in front
            }
        }
        if (angles[0] != angles[1]){
            console.warn("incompatible angles: " + JSON.stringify(angles));
        }
        for (var i=0;i<edgeIndices.length;i++){
            var index = edgeIndices[i];
            fold.edges_vertices.splice(index, 1);
            fold.edges_assignment.splice(index, 1);
            fold.edges_foldAngle.splice(index, 1);
        }
        fold.edges_vertices.push([v1, v3]);
        fold.edges_assignment.push(edgeAssignment);
        if (avgSum > 0) fold.edges_foldAngle.push(angleAvg/avgSum);
        else fold.edges_foldAngle.push(null);
        var index = fold.vertices_vertices[v1].indexOf(v2);
        fold.vertices_vertices[v1].splice(index, 1);
        fold.vertices_vertices[v1].push(v3);
        index = fold.vertices_vertices[v3].indexOf(v2);
        fold.vertices_vertices[v3].splice(index, 1);
        fold.vertices_vertices[v3].push(v1);
        return true;
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

    // class for halfedge
    class Vertex {
        constructor(point, id) {
            this._point = point;
            this._halfedge = null;
            this._id = id;
        }

        get point() {
            return this._point;
        }
        get halfedge() {
            return this._halfedge;
        }
        get id() {
            return this._id;
        }
        set point(point) {
            this._point = point;
        }
        set halfedge(halfedge) {
            this._halfedge = halfedge;
        }
    }

    class Halfedge {
        constructor(vertex) {
            this._vertex = vertex;
            this._face = null;
            this._pair = null;
            this._next = null;
            this._prev = null;
            this._isCurve = false;
            this._edge = null;
        }
        
        get vertex() {
            return this._vertex;
        }
        get face() {
            return this._face;
        }
        get pair() {
            return this._pair;
        }
        get next() {
            return this._next;
        }
        get prev() {
            return this._prev;
        }
        get isCurve() {
            return this._isCurve;
        }
        get edge() {
            return this._edge;
        }
        set vertex(vertex) {
            this._vertex = vertex;
        }
        set face(face) {
            this._face = face;
        }
        set pair(pair) {
            this._pair = pair;
        }
        set next(next) {
            this._next = next;
        }
        set prev(prev) {
            this._prev = prev;
        }
        set isCurve(isCurve) {
            this._isCurve = isCurve;
        }
        set edge(edge) {
            this._edge = edge;
        }
    }

    class Face {
        constructor(halfedge) {
            this._halfedge = halfedge;
        }

        get halfedge() {
            return this._halfedge;
        }
        set halfedge(halfedge) {
            this._halfedge = halfedge;
        }
    }

    class Edge {
        constructor(halfedge) {
            this._start = halfedge.vertex;
            this._end = halfedge.next.vertex;
            this._left = halfedge;
            this._right = null;
        }

        get start() {
            return this._start;
        }
        get end() {
            return this._end;
        }
        get left() {
            return this._left;
        }
        get right() {
            return this._right;
        }

        set start(start) {
            this._start = start;
        }
        set end(end) {
            this._end = end;
        }
        set left(left) {
            this._left = left;
        }
        set right(right) {
            this._right = right;
        }
    }

    class Model {
        constructor(edges, assignments) {
            this._faces = [];
            this._vertices = [];
            this._edges = edges;
            this._assignments = assignments;
            this._virtices_edges;
            this._triangulated_edges = [];
        }

        setHalfedgePair(halfedge) {
            for (let i = 0; i < this._faces.length; i++) {
                let halfedgeInFace = this._faces[i].halfedge;
                do {
                    if (halfedge.vertex == halfedgeInFace.next.vertex && halfedge.next.vertex == halfedgeInFace.vertex) {
                        halfedge.pair = halfedgeInFace;
                        halfedgeInFace.pair = halfedge;
                        return;
                    }
                    halfedgeInFace = halfedgeInFace.next;
                } while (halfedgeInFace != this._faces[i].halfedge);
            }
        }

        setHalfedgePair2(halfedge0, halfedge1) {
            halfedge0.pair = halfedge1;
            halfedge0.isCurve = false;
            halfedge1.pair = halfedge0;
            halfedge1.isCurve = false;
        }

        checkIsCurved(halfedge) {
            for (let i = 0; i < this._edges.length; i++) {
                if (this._edges[i][0] == halfedge.vertex.id) {
                    if (this._edges[i][1] == halfedge.next.vertex.id) {
                        if (this._assignments[i] == 'CM' || this._assignments[i] == 'CV') {
                            halfedge.isCurve = true;
                        }
                    }
                } else if (this._edges[i][1] == halfedge.vertex.id) {
                    if (this._edges[i][0] == halfedge.next.vertex.id) {
                        if (this._assignments[i] == 'CM' || this._assignments[i] == 'CV') {
                            halfedge.isCurve = true;
                        }
                    }
                }
            }
        }

        addFace(vertex0, vertex1, vertex2) {
            let veMap = this._vertices_edges;
            let halfedge0 = new Halfedge(vertex0);
            if (vertex0.halfedge == null) {
                vertex0.halfedge = halfedge0;
            }
            let halfedge1 = new Halfedge(vertex1);
            if (vertex1.halfedge == null) {
                vertex1.halfedge = halfedge1;
            }
            let halfedge2 = new Halfedge(vertex2);
            if (vertex2.halfedge == null) {
                vertex2.halfedge = halfedge2;
            }
            
            halfedge0.next = halfedge1;
            halfedge0.prev = halfedge2;
            halfedge1.next = halfedge2;
            halfedge1.prev = halfedge0;
            halfedge2.next = halfedge0;
            halfedge2.prev = halfedge1;

            let face = new Face(halfedge0);
            this._faces.push(face);
            halfedge0.face = face;
            halfedge1.face = face;
            halfedge2.face = face;
            this.setHalfedgePair(halfedge0);
            this.setHalfedgePair(halfedge1);
            this.setHalfedgePair(halfedge2);

            if (halfedge0.pair == null) {
                let edge = new Edge(halfedge0);
                this._triangulated_edges.push(edge);
                halfedge0.edge = edge;
            } else {
                let edge = halfedge0.pair.edge;
                edge.right = halfedge0;
                halfedge0.edge = edge;
            }

            if (halfedge1.pair == null) {
                let edge = new Edge(halfedge1);
                this._triangulated_edges.push(edge);
                halfedge1.edge = edge;
            } else {
                let edge = halfedge1.pair.edge;
                edge.right = halfedge1;
                halfedge1.edge = edge;
            }

            if (halfedge2.pair == null) {
                let edge = new Edge(halfedge2);
                this._triangulated_edges.push(edge);
                halfedge2.edge = edge;
            } else {
                let edge = halfedge2.pair.edge;
                edge.right = halfedge2;
                halfedge2.edge = edge;
            }

            if (halfedge0.pair == null) {
                this.checkIsCurved(halfedge0);
            } else {
                if (veMap.has(vertex0.id)) {
                    veMap.set(vertex0.id, veMap.get(vertex0.id)+1);
                } else {
                    veMap.set(vertex0.id, 1);
                }
                if (veMap.has(vertex1.id)) {
                    veMap.set(vertex1.id, veMap.get(vertex1.id)+1);
                } else {
                    veMap.set(vertex1.id, 1);
                }
            }

            if (halfedge1.pair == null) {
                this.checkIsCurved(halfedge1);
            } else {
                if (veMap.has(vertex1.id)) {
                    veMap.set(vertex1.id, veMap.get(vertex1.id)+1);
                } else {
                    veMap.set(vertex1.id, 1);
                }
                if (veMap.has(vertex2.id)) {
                    veMap.set(vertex2.id, veMap.get(vertex2.id)+1);
                } else {
                    veMap.set(vertex2.id, 1);
                }
            }

            if (halfedge2.pair == null) {
                this.checkIsCurved(halfedge2);
            } else {
                if (veMap.has(vertex0.id)) {
                    veMap.set(vertex0.id, veMap.get(vertex0.id)+1);
                } else {
                    veMap.set(vertex0.id, 1);
                }
                if (veMap.has(vertex2.id)) {
                    veMap.set(vertex2.id, veMap.get(vertex2.id)+1);
                } else {
                    veMap.set(vertex2.id, 1);
                }
            }
        }

        cross(halfedge) {
            let vertexA = halfedge.vertex;
            let vertexB = halfedge.next.vertex;
            let vertexC = halfedge.prev.vertex;
            let vertexD = halfedge.pair.prev.vertex;
            let x1 = vertexA.point[0];
            let y1 = vertexA.point[1];
            let x2 = vertexB.point[0];
            let y2 = vertexB.point[1];
            let x3 = vertexC.point[0];
            let y3 = vertexC.point[1];
            let x4 = vertexD.point[0];
            let y4 = vertexD.point[1];

            let ta = (x3-x4)*(y1-y3)+(y3-y4)*(x3-x1);
            let tb = (x3-x4)*(y2-y3)+(y3-y4)*(x3-x2);
            let tc = (x1-x2)*(y3-y1)+(y1-y2)*(x1-x3);
            let td = (x1-x2)*(y4-y1)+(y1-y2)*(x1-x4);

            return (tc*td < 0) && (ta*tb < 0);
        }

        angle(a, b, c) {
            let X1 = b[0] - a[0];
            let Y1 = b[1] - a[1];
            let X2 = c[0] - a[0];
            let Y2 = c[1] - a[1];

            let lengthX = Math.pow(X1*X1+Y1*Y1, 0.5);
            let lengthY = Math.pow(X2*X2+Y2*Y2, 0.5);
            let cos = (X1*X2+Y1*Y2) / (lengthX*lengthY);
            let theta = Math.acos(cos);
            return theta;
        }

        cHalfedge1(tmpHalfedge) {
            if (tmpHalfedge.next.isCurve) {
                return tmpHalfedge.next;
            } else {
                if (tmpHalfedge.next.pair != null) {
                    return this.cHalfedge1(tmpHalfedge.next.pair);
                } else {
                    return false;
                }
            }
        }

        cHalfedge2(tmpHalfedge) {
            if (tmpHalfedge.prev.isCurve) {
                return tmpHalfedge.prev;
            } else {
                if (tmpHalfedge.prev.pair != null) {
                    return this.cHalfedge2(tmpHalfedge.prev.pair);
                } else {
                    return false;
                }
            }
        }

        cHalfedge3(tmpHalfedge) {
            if (tmpHalfedge.prev.isCurve) {
                return tmpHalfedge.prev;
            } else {
                if (tmpHalfedge.prev.pair != null) {
                    return this.cHalfedge3(tmpHalfedge.prev.pair);
                } else {
                    return false;
                }
            }
        }

        cHalfedge4(tmpHalfedge) {
            if (tmpHalfedge.next.isCurve) {
                return tmpHalfedge.next;
            } else {
                if (tmpHalfedge.next.pair != null) {
                    return this.cHalfedge4(tmpHalfedge.next.pair);
                } else {
                    return false;
                }
            }
        }

        cHalfedge5(tmpHalfedge) {
            if (tmpHalfedge.isCurve) {
                return tmpHalfedge;
            } else {
                if (tmpHalfedge.pair != null) {
                    return this.cHalfedge5(tmpHalfedge.pair.next);
                } else {
                    return false;
                }
            }
        }

        cHalfedge6(tmpHalfedge) {
            if (tmpHalfedge.isCurve) {
                return tmpHalfedge;
            } else {
                if (tmpHalfedge.pair != null) {
                    return this.cHalfedge6(tmpHalfedge.pair.prev);
                } else {
                    return false;
                }
            }
        }

        cHalfedge7(tmpHalfedge) {
            if (tmpHalfedge.isCurve) {
                return tmpHalfedge;
            } else {
                if (tmpHalfedge.pair != null) {
                    return this.cHalfedge7(tmpHalfedge.pair.prev);
                } else {
                    return false;
                }
            }
        }
        cHalfedge8(tmpHalfedge) {
            if (tmpHalfedge.isCurve) {
                return tmpHalfedge;
            } else {
                if (tmpHalfedge.pair != null) {
                    return this.cHalfedge8(tmpHalfedge.pair.next);
                } else {
                    return false;
                }
            }
        }

        orthogonal(halfedge) {
            let cHalfedge1 = null;
            let cHalfedge2 = null; 
            let cHalfedge3 = null;
            let cHalfedge4 = null;
            let cHalfedge5 = null;
            let cHalfedge6 = null; 
            let cHalfedge7 = null;
            let cHalfedge8 = null;

            let angleA1 = 0;
            let angleA2 = 0;
            let angleB1 = 0;
            let angleB2 = 0;
            let angleC1 = 0;
            let angleC2 = 0;
            let angleD1 = 0;
            let angleD2 = 0;

            let diffAngleA = null;
            let diffAngleB = null;
            let diffAngleC = null;
            let diffAngleD = null;

            cHalfedge1 = this.cHalfedge1(halfedge.pair);
            cHalfedge2 = this.cHalfedge2(halfedge);
            cHalfedge3 = this.cHalfedge3(halfedge.pair);
            cHalfedge4 = this.cHalfedge4(halfedge);
            cHalfedge5 = this.cHalfedge5(halfedge.pair.prev);
            cHalfedge6 = this.cHalfedge6(halfedge.pair.next);
            cHalfedge7 = this.cHalfedge7(halfedge.next);
            cHalfedge8 = this.cHalfedge8(halfedge.prev);

            if (cHalfedge1) {
                angleA1 = this.angle(halfedge.vertex.point, cHalfedge1.next.vertex.point, halfedge.next.vertex.point);
            }
            if (cHalfedge2) {
                angleA2 = this.angle(halfedge.vertex.point, cHalfedge2.vertex.point, halfedge.next.vertex.point);
            }
            if (cHalfedge1 && cHalfedge2) {
                diffAngleA = Math.pow(angleA1-angleA2, 2);
            }
            if (cHalfedge3) {
                angleB1 = this.angle(halfedge.next.vertex.point, cHalfedge3.vertex.point, halfedge.vertex.point);
            }
            if (cHalfedge4) {
                angleB2 = this.angle(halfedge.next.vertex.point, cHalfedge4.next.vertex.point, halfedge.vertex.point);
            }
            if (cHalfedge3 && cHalfedge4) {
                diffAngleB = Math.pow(angleB1-angleB2, 2);
            }
            if (cHalfedge5) {
                angleC1 = this.angle(halfedge.pair.prev.vertex.point, cHalfedge5.next.vertex.point, halfedge.prev.vertex.point);
            }
            if (cHalfedge6) {
                angleC2 = this.angle(halfedge.pair.prev.vertex.point, cHalfedge6.vertex.point, halfedge.prev.vertex.point);
            }
            if (cHalfedge5 && cHalfedge6) {
                diffAngleC = Math.pow(angleC1-angleC2, 2);
            }
            if (cHalfedge7) {
                angleD1 = this.angle(halfedge.prev.vertex.point, cHalfedge7.vertex.point, halfedge.pair.prev.vertex.point);
            }
            if (cHalfedge8) {
                angleD2 = this.angle(halfedge.prev.vertex.point, cHalfedge8.next.vertex.point, halfedge.pair.prev.vertex.point);
            }
            if (cHalfedge7 && cHalfedge8) {
                diffAngleD = Math.pow(angleD1-angleD2, 2);
            }

            if (diffAngleC && diffAngleD) {
                if (diffAngleA && diffAngleB) {
                    if (diffAngleA + diffAngleB > diffAngleC + diffAngleD) {
                        return diffAngleC + diffAngleD;
                    }
                } else if (!diffAngleA && !diffAngleB) {
                    return diffAngleC + diffAngleD;
                } else if (diffAngleA && !diffAngleB) {
                    if (diffAngleA * 2 > diffAngleC + diffAngleD) {
                        return diffAngleC + diffAngleD;
                    }
                } else if (!diffAngleA && diffAngleB) {
                    if (diffAngleB * 2 > diffAngleC + diffAngleD) {
                        return diffAngleC + diffAngleD;
                    }
                }
            } else if (diffAngleC && !diffAngleD) {
                if (!diffAngleA && !diffAngleB) {
                    return diffAngleC * 2;
                } else if (diffAngleA && diffAngleB) {
                    if (diffAngleA + diffAngleB > diffAngleC * 2) {
                        return diffAngleC * 2;
                    }
                } else if (diffAngleA && !diffAngleB) {
                    if (diffAngleA > diffAngleC) {
                        return diffAngleC * 2;
                    }
                } else if (!diffAngleA && diffAngleB) {
                    if (diffAngleB > diffAngleC) {
                        return diffAngleC * 2;
                    }
                }
            } else if (!diffAngleC && diffAngleD) {
                if (!diffAngleA && !diffAngleB) {
                    return diffAngleD * 2;
                } else if (diffAngleA & diffAngleB) {
                    if (diffAngleA + diffAngleB > diffAngleD * 2) {
                        return diffAngleD * 2;
                    }
                } else if (diffAngleA && !diffAngleB) {
                    if (diffAngleA > diffAngleD) {
                        return diffAngleD * 2;
                    }
                } else if (!diffAngleA && diffAngleB) {
                    if (diffAngleB > diffAngleD) {
                        return diffAngleD * 2;
                    }
                }
            }
            return Infinity;
        }

        checkVertexNumber(halfedge) {
            let veMap = this._vertices_edges;
            if (veMap.get(halfedge.prev.vertex.id) >= 4) {
                return false;
            }
            if (veMap.get(halfedge.pair.prev.vertex.id) >= 4) {
                return false;
            }
            return true;
        }

        edgeSwap(halfedge) {// https://mitani.cs.tsukuba.ac.jp/lecture/jikken/polygon_operation.pdf

            let heLT = halfedge.prev.pair;
            if (heLT == null) {
                var dheLT = new Halfedge(halfedge.vertex);
                dheLT.edge = halfedge.prev.edge;
            }
            let heRT = halfedge.next.pair;
            if (heRT == null) {
                var dheRT = new Halfedge(halfedge.prev.vertex);
                dheRT.edge = halfedge.next.edge;
            }
            let heLB = halfedge.pair.next.pair;
            if (heLB == null) {
                var dheLB = new Halfedge(halfedge.pair.prev.vertex);
                dheLB.edge = halfedge.pair.next.edge;
            }
            let heRB = halfedge.pair.prev.pair;
            if (heRB == null) {
                var dheRB = new Halfedge(halfedge.pair.vertex);
                dheRB.edge = halfedge.pair.prev.edge;
            }

            if (heRB != null) {
                halfedge.next.vertex.halfedge = heRB;
            }
            if (heRT != null) {
                halfedge.prev.vertex.halfedge = heRT;
            }
            if (heLT != null) {
                halfedge.vertex.halfedge = heLT;
            }
            if (heLB != null) {
                halfedge.pair.prev.vertex.halfedge = heLB;
            }
            
            halfedge.vertex = heLB ? heLB.vertex : dheLB.vertex;
            halfedge.next.vertex = heRT ? heRT.vertex : dheRT.vertex;
            halfedge.prev.vertex = heLT ? heLT.vertex : dheLT.vertex;
            halfedge.pair.vertex = heRT ? heRT.vertex : dheRT.vertex;
            halfedge.pair.next.vertex = heLB ? heLB.vertex : dheLB.vertex;
            halfedge.pair.prev.vertex = heRB ? heRB.vertex : dheRB.vertex;

            halfedge.edge.start = halfedge.vertex;
            halfedge.edge.end = halfedge.pair.vertex;

            if (heLT != null) {
                this.setHalfedgePair2(heLT, halfedge.next);
                let edge = heLT.edge;
                edge.left = heLT;
                edge.right = halfedge.next;
                edge.start = heLT.vertex;
                edge.end = halfedge.next.vertex;
                halfedge.next.edge = edge;
            } else {
                halfedge.next.pair = null;
                halfedge.next.isCurve = false;
                this.checkIsCurved(halfedge.next);
                let edge = dheLT.edge;
                edge.left = halfedge.next;
                edge.right = null;
                edge.start = halfedge.next.vertex;
                edge.end = halfedge.next.next.vertex;
                halfedge.next.edge = edge;
            }
            if (heLB != null) {
                this.setHalfedgePair2(heLB, halfedge.prev);
                let edge = heLB.edge;
                edge.left = heLB;
                edge.right = halfedge.prev;
                edge.start = heLB.vertex;
                edge.end = halfedge.prev.vertex;
                halfedge.prev.edge = edge;
            } else {
                halfedge.prev.pair = null;
                halfedge.prev.isCurve = false;
                this.checkIsCurved(halfedge.prev);
                let edge = dheLB.edge;
                edge.left = halfedge.prev;
                edge.right = null;
                edge.start = halfedge.prev.vertex;
                edge.end = halfedge.prev.next.vertex;
                halfedge.prev.edge = edge;
            }
            if (heRT != null) {
                this.setHalfedgePair2(heRT, halfedge.pair.prev);
                let edge = heRT.edge;
                edge.left = heRT;
                edge.right = halfedge.pair.prev;
                edge.start = heRT.vertex;
                edge.end = halfedge.pair.prev.vertex;
                halfedge.pair.prev.edge = edge;
            } else {
                halfedge.pair.prev.pair = null;
                halfedge.pair.prev.isCurve = false;
                this.checkIsCurved(halfedge.pair.prev);
                let edge = dheRT.edge;
                edge.left = halfedge.pair.prev;
                edge.right = null;
                edge.start = halfedge.pair.prev.vertex;
                edge.end = halfedge.pair.prev.next.vertex;
                halfedge.pair.prev.edge = edge;
            }
            if (heRB != null) {
                this.setHalfedgePair2(heRB, halfedge.pair.next);
                let edge = heRB.edge;
                edge.left = heRB;
                edge.right = halfedge.pair.next;
                edge.start = heRB.vertex;
                edge.end = halfedge.pair.next.vertex;
                halfedge.pair.next.edge = edge;
            } else {
                halfedge.pair.next.pair = null;
                halfedge.pair.next.isCurve = false;
                this.checkIsCurved(halfedge.pair.next);
                let edge = dheRB.edge;
                edge.left = halfedge.pair.next;
                edge.right = null;
                edge.start = halfedge.pair.next.vertex;
                edge.end = halfedge.pair.next.next.vertex;
                halfedge.pair.next.edge = edge;
            }

            let veMap = this._vertices_edges;
            if (veMap.has(halfedge.vertex.id)) {
                veMap.set(halfedge.vertex.id, veMap.get(halfedge.vertex.id)+1);
            } else {
                veMap.set(halfedge.vertex.id, 1);
            }
            if (veMap.has(halfedge.next.vertex.id)) {
                veMap.set(halfedge.next.vertex.id, veMap.get(halfedge.next.vertex.id)+1);
            } else {
                veMap.set(halfedge.next.vertex.id, 1);
            }
            veMap.set(halfedge.prev.vertex.id, veMap.get(halfedge.prev.vertex.id)-1);
            veMap.set(halfedge.pair.prev.vertex.id, veMap.get(halfedge.pair.prev.vertex.id)-1);

            return true;
        }

        get vertices() {
            return this._vertices;
        }
        get faces() {
            return this._faces;
        }
        get verticesEdges() {
            return this._vertices_edges;
        }
        get triangulatedEdges() {
            return this._triangulated_edges;
        }

        set verticesEdges(array) {
            this._vertices_edges = array;
        }
    }

    function triangulatePolys(fold) {
        var vertices = fold.vertices_coords;
        var faces = fold.faces_vertices;
        var edges = fold.edges_vertices;
        var foldAngles = fold.edges_foldAngle;
        var assignments = fold.edges_assignment;
        var triangulatedFaces = [];
        for (var i=0;i<faces.length;i++){

            var face = faces[i];

            if (face.length == 3){
                triangulatedFaces.push(face);
                continue;
            }

            //check for quad and solve manually
            if (face.length == 4){
                var faceV1 = makeVector(vertices[face[0]]);
                var faceV2 = makeVector(vertices[face[1]]);
                var faceV3 = makeVector(vertices[face[2]]);
                var faceV4 = makeVector(vertices[face[3]]);
                var dist1 = (faceV1.clone().sub(faceV3)).lengthSq();
                var dist2 = (faceV2.clone().sub(faceV4)).lengthSq();
                if (dist2<dist1) {
                    edges.push([face[1], face[3]]);
                    foldAngles.push(0);
                    assignments.push("F");
                    triangulatedFaces.push([face[0], face[1], face[3]]);
                    triangulatedFaces.push([face[1], face[2], face[3]]);
                } else {
                    edges.push([face[0], face[2]]);
                    foldAngles.push(0);
                    assignments.push("F");
                    triangulatedFaces.push([face[0], face[1], face[2]]);
                    triangulatedFaces.push([face[0], face[2], face[3]]);
                }
                continue;
            }

            var faceEdges = [];
            for (var j=0;j<edges.length;j++){
                var edge = edges[j];
                if (face.indexOf(edge[0]) >= 0 && face.indexOf(edge[1]) >= 0){
                    faceEdges.push(j);
                }
            }

            var faceVert = [];
            for (var j=0;j<face.length;j++){
                var vertex = vertices[face[j]];
                faceVert.push(vertex[0]);
                faceVert.push(vertex[2]);
            }

            let cdt_points = [];
            for (let i = 0; i < faceVert.length-1; i+=2) {
                cdt_points.push([faceVert[i],faceVert[i+1]]);
            }

            let cdt_edges =[];
            for (let i = 0; i < faceVert.length/2-1; i++) {
                cdt_edges.push([i, i+1]);
            }
            cdt_edges.push([faceVert.length/2-1, 0]);

            let cdt2d = require('cdt2d');
            let cdt_result = cdt2d(cdt_points, cdt_edges, {exterior: false});

            let triangles = [];
            for (let i = 0; i < cdt_result.length; i++) {
                triangles.push(cdt_result[i][0]);
                triangles.push(cdt_result[i][1]);
                triangles.push(cdt_result[i][2]);
            }

            let model = new Model(edges, assignments);
            for (let i = 0; i < faceVert.length; i+=2) {
                let vertex = new Vertex([faceVert[i], faceVert[i+1]], face[i/2]);
                model.vertices.push(vertex);
            }
            model.verticesEdges = new Map();
            for (let index = 0; index < model.vertices.length; index++) {
                model.verticesEdges.set(index, 0);
            }
            for (let i = 0; i < triangles.length; i+=3) {
                model.addFace(model.vertices[triangles[i]], model.vertices[triangles[i+1]], model.vertices[triangles[i+2]]);
            }

            let flag, repeat = 0;
            while (repeat < 1000) {
                flag = true;
                let minAngle = Infinity;
                let edgeNum = -1;
                for (let index = 0; index < model.triangulatedEdges.length; index++) {
                    const edge = model.triangulatedEdges[index];
                    if (edge.left.pair != null) {
                        if (model.cross(edge.left)) {
                            if (model.checkVertexNumber(edge.left)) {
                                if (model.orthogonal(edge.left) < minAngle) {
                                    flag = false;
                                    minAngle = model.orthogonal(edge.left);
                                    edgeNum = index;
                                }
                            }
                        }
                    }
                }
                if (flag) {
                    break;
                } else {
                    model.edgeSwap(model.triangulatedEdges[edgeNum].left);
                }
                repeat++;
            }

            triangles = [];
            for (let i = 0; i < model.faces.length; i++) {
                let face = model.faces[i];
                let tri1 = face.halfedge.vertex.id;
                let tri2 = face.halfedge.next.vertex.id;
                let tri3 = face.halfedge.next.next.vertex.id;
                triangles.push(tri1);
                triangles.push(tri2);
                triangles.push(tri3);
            }

            for (var j=0;j<triangles.length;j+=3){
                var tri = [triangles[j+2], triangles[j+1], triangles[j]];
                var foundEdges = [false, false, false];//ab, bc, ca

                for (var k=0;k<faceEdges.length;k++){
                    var edge = edges[faceEdges[k]];

                    var aIndex = edge.indexOf(tri[0]);
                    var bIndex = edge.indexOf(tri[1]);
                    var cIndex = edge.indexOf(tri[2]);

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
                        faceEdges.push(edges.length);
                        edges.push([tri[0], tri[1]]);
                        foldAngles.push(0);
                        assignments.push("F");
                    } else if (k==1){
                        faceEdges.push(edges.length);
                        edges.push([tri[2], tri[1]]);
                        foldAngles.push(0);
                        assignments.push("F");
                    } else if (k==2){
                        faceEdges.push(edges.length);
                        edges.push([tri[2], tri[0]]);
                        foldAngles.push(0);
                        assignments.push("F");
                    }
                }

                triangulatedFaces.push(tri);
            }
        }
        fold.faces_vertices = triangulatedFaces;
        return fold;
    }

    function saveSVG(){
        if (globals.extension == "fold"){
            //todo solve for crease pattern
            globals.warn("No crease pattern available for files imported from FOLD format.");
            return;
        }
        gtag('event', 'saveCP', { 'CC': true });

        var serializer = new XMLSerializer();
        var source = serializer.serializeToString($("#svgViewer>svg").get(0));
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
        var foldAngles = fold.edges_foldAngle;
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
        return fold;
    }

    function makeVector(v){
        if (v.length == 2) return makeVector2(v);
        return makeVector3(v);
    }
    function makeVector2(v){
        return new THREE.Vector2(v[0], v[1]);
    }
    function makeVector3(v){
        return new THREE.Vector3(v[0], v[1], v[2]);
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

    function getFoldData(raw){
        if (raw) return rawFold;
        return foldData;
    }

    function setFoldData(fold, isDemo, returnCreaseParams){
        if (!returnCreaseParams) {
            if (isDemo) {
                gtag('event', 'demoFile', { 'CC': true });
            } else {
                gtag('event', 'uploadCP', { 'CC': true });
            }
        }
        
        clearAll();
        return processFold(fold, returnCreaseParams);
    }

    function getTriangulatedFaces(){
        return foldData.faces_vertices;
    }

    return {
        loadSVG : loadSVG,
        saveSVG : saveSVG,
        getFoldData: getFoldData,
        getTriangulatedFaces: getTriangulatedFaces,
        setFoldData : setFoldData
    }
}